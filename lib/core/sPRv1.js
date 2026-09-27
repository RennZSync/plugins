/**
 * sPR.js — Send Private Relay By RennZSync, Renz Tech
 */

import {
  encodeWAMessage,
  generateMessageIDV2,
  encodeSignedDeviceIdentity,
  prepareWAMessageMedia,
  jidDecode,
  jidNormalizedUser
} from 'baileys';
import axios from 'axios';
import crypto from 'crypto';

const avatarCache = new Map();
const uploadCache = new Map();

const norm = (jid = '') => jid.split(':')[0].split('@')[0];

const safeNorm = jid => {
  if (!jid) return null;
  try { return jidNormalizedUser(jid); } catch { return jid; }
};

const getMsgId = conn => {
  try { return generateMessageIDV2(conn.user?.id); } catch {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }
};

async function fetchBuffer(url) {
  if (!url) return null;
  if (avatarCache.has(url)) return avatarCache.get(url);
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buf = Buffer.from(res.data);
    if (buf?.length) {
      avatarCache.set(url, buf);
      if (avatarCache.size > 200) avatarCache.delete(avatarCache.keys().next().value);
      return buf;
    }
  } catch (_) {}
  return null;
}

async function uploadBuffer(conn, buffer) {
  if (!buffer?.length) return null;
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  if (uploadCache.has(hash)) return uploadCache.get(hash);
  try {
    const media = await prepareWAMessageMedia({ image: buffer }, { upload: conn.waUploadToServer });
    if (media?.imageMessage) {
      uploadCache.set(hash, media.imageMessage);
      return media.imageMessage;
    }
  } catch (_) {}
  return null;
}

async function resolvePhone(conn, jid) {
  const userPart = jidDecode(jid)?.user || jid.split('@')[0];
  if (jid.endsWith('@s.whatsapp.net')) return userPart;
  try {
    if (conn.signalRepository?.lidMapping?.getPNForLID) {
      const pn = await conn.signalRepository.lidMapping.getPNForLID(jid);
      if (pn) return jidDecode(pn)?.user || pn.split('@')[0];
    }
  } catch (_) {}
  return userPart;
}

async function resolveDisplayName(conn, jid, participant) {
  const normJid = safeNorm(jid);
  const contact =
    conn.store?.contacts?.[normJid] ||
    conn.store?.contacts?.[jid] ||
    {};

  const name =
    contact.notify ||
    contact.name ||
    contact.verifiedName ||
    participant?.notify ||
    participant?.name;

  if (name) return name;

  const phone = await resolvePhone(conn, jid);
  return phone || jid.split('@')[0];
}

async function resolveTargets(conn, participants, targetJids) {
  const normalized = [];
  for (const t of targetJids) {
    if (!t) continue;
    normalized.push(norm(t));
    try {
      const lid = await conn.signalRepository?.lidMapping?.getLIDForPN(t);
      if (lid) normalized.push(norm(lid));
    } catch (_) {}
    try {
      const pn = await conn.signalRepository?.lidMapping?.getPNForLID(t);
      if (pn) normalized.push(norm(pn));
    } catch (_) {}
  }

  return participants.filter(p =>
    normalized.some(n => n === norm(p.id) || n === norm(p.phoneNumber || ''))
  );
}

export function generateSigningKeyPair() {
  const keyPair = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' }
  });
  return {
    public: keyPair.publicKey,
    private: keyPair.privateKey
  };
}

export function getMessageKey(seed = crypto.randomBytes(32)) {
  return crypto.createHash('sha256').update(seed).digest();
}

export function createSKDM(options = {}) {
  const { id = crypto.randomBytes(4).readUInt32BE(0), iteration = 0, seed, signingKey } = options;
  return {
    id,
    iteration,
    seed: seed || getMessageKey(),
    signingKey: signingKey || generateSigningKeyPair().public
  };
}

export async function encryptGroupMessage({ group, data, meId }, conn) {
  if (conn?.signalRepository?.encryptGroupMessage) {
    return await conn.signalRepository.encryptGroupMessage({ group, data, meId });
  }
  return {
    ciphertext: encodeWAMessage({ protocolMessage: { type: 0 } })
  };
}

export async function sendPrivateMessage(conn, jid, message, targetJids = [], opts = {}) {
  const { additionalNodes = [] } = opts;
  const meta = await conn.groupMetadata(jid);
  const targets = await resolveTargets(conn, meta.participants, targetJids);
  if (!targets.length) throw new Error('Tidak ada target valid');

  const targetIds = targets.map(p => p.id);
  try { await conn.assertSessions(targetIds, false); } catch (_) {}

  const skmsgBytes = encodeWAMessage({ protocolMessage: { type: 0 } });
  const msgBytes = encodeWAMessage(message);
  const meId = conn.authState?.creds?.me?.lid || conn.user?.id;
  const isLid = meta.addressingMode === 'lid';

  let groupCiphertext = null;
  try {
    const enc = await encryptGroupMessage({ group: jid, data: skmsgBytes, meId }, conn);
    groupCiphertext = enc.ciphertext;
  } catch (_) {}

  let shouldIncludeDeviceIdentity = false;
  const participantNodes = (await Promise.all(
    targets.map(async p => {
      try {
        const { type, ciphertext } = await conn.signalRepository.encryptMessage({ jid: p.id, data: msgBytes });
        if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;
        return {
          tag: 'to',
          attrs: { jid: p.id },
          content: [{ tag: 'enc', attrs: { v: '2', type }, content: ciphertext }]
        };
      } catch (_) { return null; }
    })
  )).filter(Boolean);

  const msgId = getMsgId(conn);
  const stanzaContent = [];

  if (groupCiphertext) stanzaContent.push({ tag: 'enc', attrs: { v: '2', type: 'skmsg' }, content: groupCiphertext });
  if (participantNodes.length) stanzaContent.push({ tag: 'participants', attrs: {}, content: participantNodes });
  if (shouldIncludeDeviceIdentity && conn.authState?.creds?.account) {
    stanzaContent.push({
      tag: 'device-identity',
      attrs: {},
      content: encodeSignedDeviceIdentity(conn.authState.creds.account, true)
    });
  }
  stanzaContent.push(...additionalNodes);

  await conn.query({
    tag: 'message',
    attrs: {
      id: msgId,
      to: jid,
      type: 'text',
      ...(isLid ? { addressing_mode: 'lid' } : {})
    },
    content: stanzaContent
  });

  return msgId;
}

export async function sendGroupPersonalizedTag(conn, groupJid, customText = '') {
  const meta = await conn.groupMetadata(groupJid);
  const participants = meta.participants || [];
  if (!participants.length) throw new Error('Tidak ada peserta');

  const meId = conn.authState?.creds?.me?.lid || conn.user?.id;
  const isLid = meta.addressingMode === 'lid';

  const participantJids = participants.map(p => p.id);
  let rawDevices = [];
  try {
    if (conn.getUSyncDevices) rawDevices = await conn.getUSyncDevices(participantJids, true, false) || [];
  } catch (_) {}
  if (!rawDevices.length) rawDevices = participantJids.map(jid => ({ jid, user: jidDecode(jid)?.user }));
  const validDevices = rawDevices.filter(d => d?.jid && !d.jid.includes(':99') && !d.jid.endsWith('@hosted.lid'));

  const defaultAvatarBuf = await fetchBuffer('https://raw.githubusercontent.com/himanackerman/Image/main/anu/1790481463212-dc8b2a29.jpg');
  const defaultImageMsg = await uploadBuffer(conn, defaultAvatarBuf);
  const fallbackImg = defaultImageMsg || { url: 'https://mmg.whatsapp.net', mimetype: 'image/jpeg', fileSha256: Buffer.alloc(32), fileLength: 1000, mediaKey: Buffer.alloc(32) };

  const ppMap = new Map();
  const nameMap = new Map();

  await Promise.all(participants.map(async p => {

    // foto profil
    try {
      let ppUrl = await conn.profilePictureUrl(p.id, 'image').catch(() => null);
      if (!ppUrl && p.id.endsWith('@lid')) {
        const phone = await resolvePhone(conn, p.id);
        if (phone) ppUrl = await conn.profilePictureUrl(phone + '@s.whatsapp.net', 'image').catch(() => null);
      }
      if (ppUrl) {
        const buf = await fetchBuffer(ppUrl);
        if (buf?.length) {
          const imgMsg = await uploadBuffer(conn, buf);
          if (imgMsg) {
            ppMap.set(safeNorm(p.id), imgMsg);
            const up = jidDecode(p.id)?.user;
            if (up) ppMap.set(up, imgMsg);
          }
        }
      }
    } catch (_) {}

// username 
    try {
      const displayName = await resolveDisplayName(conn, p.id, p);
      nameMap.set(safeNorm(p.id), displayName);
      const up = jidDecode(p.id)?.user;
      if (up) nameMap.set(up, displayName);
    } catch (_) {}
  }));

  const defaultMsg = { imageMessage: { ...fallbackImg, caption: customText || '👥 Halo semuanya!', contextInfo: {} } };
  const skmsgBytes = encodeWAMessage(defaultMsg);
  let groupCiphertext = null;
  try {
    const enc = await encryptGroupMessage({ group: groupJid, data: skmsgBytes, meId }, conn);
    groupCiphertext = enc.ciphertext;
  } catch (_) {}

  let shouldIncludeDeviceIdentity = false;
  const participantNodes = (await Promise.all(validDevices.map(async device => {
    const targetJid = device.jid;
    const normJid = safeNorm(targetJid);
    const userPart = jidDecode(targetJid)?.user;
    const imgMsg = ppMap.get(normJid) || ppMap.get(userPart) || fallbackImg;
    const displayName = nameMap.get(normJid) || nameMap.get(userPart) || userPart;

    const nameTag = `*${displayName}*`;
    const caption = customText
      ? (customText.includes('{name}') ? customText.replace(/\{name\}/g, nameTag) : `${nameTag} ${customText}`)
      : `Halo ${nameTag} 👋`;

    const mentionedJid = [targetJid];
    if (targetJid.endsWith('@lid')) {
      const phone = await resolvePhone(conn, targetJid);
      const mappedPn = phone + '@s.whatsapp.net';
      if (!mentionedJid.includes(mappedPn)) mentionedJid.push(mappedPn);
    }

    const personalMsg = { imageMessage: { ...imgMsg, caption, contextInfo: { mentionedJid } } };
    try {
      const bytes = encodeWAMessage(personalMsg);
      const { type, ciphertext } = await conn.signalRepository.encryptMessage({ jid: targetJid, data: bytes });
      if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;
      return { tag: 'to', attrs: { jid: targetJid }, content: [{ tag: 'enc', attrs: { v: '2', type }, content: ciphertext }] };
    } catch (_) { return null; }
  }))).filter(Boolean);

  const msgId = getMsgId(conn);
  const stanzaContent = [];
  if (groupCiphertext) stanzaContent.push({ tag: 'enc', attrs: { v: '2', type: 'skmsg' }, content: groupCiphertext });
  if (participantNodes.length) stanzaContent.push({ tag: 'participants', attrs: {}, content: participantNodes });
  if (shouldIncludeDeviceIdentity && conn.authState?.creds?.account) {
    stanzaContent.push({ tag: 'device-identity', attrs: {}, content: encodeSignedDeviceIdentity(conn.authState.creds.account, true) });
  }

  await conn.query({
    tag: 'message',
    attrs: { id: msgId, to: groupJid, type: 'text', ...(isLid ? { addressing_mode: 'lid' } : {}) },
    content: stanzaContent
  });

  return msgId;
}

export async function sendGroupPersonalizedMessage(conn, groupJid, { targetJids = [], msgForTarget = '', msgForOthers = null } = {}) {
  const meta = await conn.groupMetadata(groupJid);
  const participants = meta.participants || [];
  const meId = conn.authState?.creds?.me?.lid || conn.user?.id;
  const isLid = meta.addressingMode === 'lid';

  const targets = await resolveTargets(conn, participants, targetJids);
  if (!targets.length) throw new Error('Tidak ada target valid');

  const targetIds = targets.map(p => p.id);
  try { await conn.assertSessions(targetIds, false); } catch (_) {}

  let groupCiphertext = null;
  if (msgForOthers) {
    try {
      const othersBytes = encodeWAMessage({ extendedTextMessage: { text: msgForOthers } });
      const enc = await encryptGroupMessage({ group: groupJid, data: othersBytes, meId }, conn);
      groupCiphertext = enc.ciphertext;
    } catch (_) {}
  } else {
    try {
      const dummyBytes = encodeWAMessage({ protocolMessage: { type: 0 } });
      const enc = await encryptGroupMessage({ group: groupJid, data: dummyBytes, meId }, conn);
      groupCiphertext = enc.ciphertext;
    } catch (_) {}
  }

  let shouldIncludeDeviceIdentity = false;
  const participantNodes = [];
  for (const p of targets) {
    try {
      const bytes = encodeWAMessage({ extendedTextMessage: { text: msgForTarget } });
      const { type, ciphertext } = await conn.signalRepository.encryptMessage({ jid: p.id, data: bytes });
      if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;
      participantNodes.push({
        tag: 'to',
        attrs: { jid: p.id },
        content: [{ tag: 'enc', attrs: { v: '2', type }, content: ciphertext }]
      });
    } catch (_) {}
  }

  const msgId = getMsgId(conn);
  const stanzaContent = [];
  if (groupCiphertext) stanzaContent.push({ tag: 'enc', attrs: { v: '2', type: 'skmsg' }, content: groupCiphertext });
  if (participantNodes.length) stanzaContent.push({ tag: 'participants', attrs: {}, content: participantNodes });
  if (shouldIncludeDeviceIdentity && conn.authState?.creds?.account) {
    stanzaContent.push({ tag: 'device-identity', attrs: {}, content: encodeSignedDeviceIdentity(conn.authState.creds.account, true) });
  }

  await conn.query({
    tag: 'message',
    attrs: { id: msgId, to: groupJid, type: 'text', ...(isLid ? { addressing_mode: 'lid' } : {}) },
    content: stanzaContent
  });

  return msgId;
}

export async function sPR(conn, jid, message, targetJids = [], opts = {}) {
  return sendPrivateMessage(conn, jid, message, targetJids, opts);
}

export default sPR;
