/*
 * Fitur : Telegram Sticker Pack -> WA Native Sticker Pack
 * Type  : Plugins ESM (LYNNA AI)
 * Path  : plugins/sticker/sticketele.js
 * Note  : butuh `sharp` (npm i sharp). jszip, fluent-ffmpeg & node-webpmux sudah ada.
 *         Tambahkan di config.js:  global.tgToken = 'TOKEN_BOT_TELEGRAM'
 */

import crypto from 'crypto';
import https from 'https';
import JSZip from 'jszip';
import { videoToWebp } from '../../lib/core/exif.js';
import { addExif } from '../../lib/core/sticker.js';

const MAX_PACK_SIZE = 60;
const CONCURRENCY = 6;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest();

const toB64Url = (buf) =>
	Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

async function loadSharp() {
	const mod = await import('sharp').catch(() => null);
	if (!mod?.default) throw new Error('Module sharp belum terinstall. Jalankan: npm i sharp');
	return mod.default;
}

async function makeTrayWebp(buffer) {
	const sharp = await loadSharp();
	return sharp(buffer, { animated: false }).resize(252, 252, { fit: 'cover' }).webp().toBuffer();
}

async function makeBlankTrayWebp() {
	const sharp = await loadSharp();
	return sharp({
		create: { width: 252, height: 252, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
	})
		.webp()
		.toBuffer();
}

async function makeThumbnailJpeg(buffer) {
	const sharp = await loadSharp();
	return sharp(buffer).resize(252, 252, { fit: 'cover' }).jpeg().toBuffer();
}

async function uploadToServer(conn, buffer, { hkdf, mediaPath, mediaKey = crypto.randomBytes(32) }) {
	const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(hkdf), 112));
	const iv = expanded.subarray(0, 16);
	const cipherKey = expanded.subarray(16, 48);
	const macKey = expanded.subarray(48, 80);

	const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
	const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
	const mac = crypto.createHmac('sha256', macKey).update(iv).update(encrypted).digest().subarray(0, 10);
	const encBuffer = Buffer.concat([encrypted, mac]);

	const fileSha256 = sha256(buffer);
	const fileEncSha256 = sha256(encBuffer);

	const iq = await conn.query({
		tag: 'iq',
		attrs: {
			id: conn.generateMessageTag?.() ?? Date.now().toString(),
			to: 's.whatsapp.net',
			type: 'set',
			xmlns: 'w:m',
		},
		content: [{ tag: 'media_conn', attrs: {} }],
	});

	const mediaConn = iq.content?.find((v) => v.tag === 'media_conn');
	if (!mediaConn) throw new Error('media_conn tidak ditemukan');

	const auth = mediaConn.attrs?.auth;
	if (!auth) throw new Error('auth media_conn tidak ditemukan');

	const hosts = (mediaConn.content || [])
		.filter((v) => v.tag === 'host')
		.map((v) => v.attrs?.hostname)
		.filter(Boolean);
	if (!hosts.length) throw new Error('host upload tidak ditemukan');

	const token = encodeURIComponent(toB64Url(fileEncSha256));
	let lastError;

	for (const host of hosts) {
		try {
			const json = await new Promise((resolve, reject) => {
				const url = new URL(`https://${host}${mediaPath}/${token}?auth=${encodeURIComponent(auth)}&token=${token}`);
				const req = https.request(
					{
						hostname: url.hostname,
						port: 443,
						path: url.pathname + url.search,
						method: 'POST',
						headers: {
							Origin: 'https://web.whatsapp.com',
							Referer: 'https://web.whatsapp.com/',
							'Content-Type': 'application/octet-stream',
							'Content-Length': encBuffer.length,
						},
					},
					(res) => {
						let body = '';
						res.on('data', (c) => (body += c));
						res.on('end', () => {
							if (res.statusCode < 200 || res.statusCode >= 300) {
								return reject(new Error(`Upload gagal ${res.statusCode}: ${body}`));
							}
							try {
								resolve(JSON.parse(body));
							} catch {
								reject(new Error(`Response bukan JSON: ${body}`));
							}
						});
					}
				);
				req.on('error', reject);
				req.write(encBuffer);
				req.end();
			});

			const directPath = json.direct_path ?? json.directPath ?? json.url ?? json.path;
			if (!directPath) throw new Error('directPath tidak ditemukan');

			return { mediaKey, fileLength: buffer.length, fileSha256, fileEncSha256, directPath, ...json };
		} catch (e) {
			lastError = e;
		}
	}

	throw lastError ?? new Error('Semua host upload gagal');
}


async function sendCustomStickerPack(conn, m, pack, meta) {
	const zip = new JSZip();
	const stickersMetadata = [];

	for (const item of pack) {
		const fileName = `${toB64Url(sha256(item.buffer))}.${item.ext}`;
		zip.file(fileName, item.buffer);
		stickersMetadata.push({
			fileName,
			isAnimated: item.isAnimated,
			emojis: [''],
			accessibilityLabel: '',
			isLottie: false,
			mimetype: item.mimetype,
		});
	}

	const trayIconFileName = 'tray_icon.webp';
	const traySource = pack[0]?.buffer;
	const trayBuffer = traySource ? await makeTrayWebp(traySource) : await makeBlankTrayWebp();
	zip.file(trayIconFileName, trayBuffer);

	const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

	const packUpload = await uploadToServer(conn, archive, {
		hkdf: 'WhatsApp Sticker Pack Keys',
		mediaPath: '/mms/sticker-pack',
	});

	const thumbnailBuffer = await makeThumbnailJpeg(trayBuffer);
	const thumbUpload = await uploadToServer(conn, thumbnailBuffer, {
		hkdf: 'WhatsApp Sticker Pack Thumbnail Keys',
		mediaPath: '/mms/thumbnail-sticker-pack',
		mediaKey: packUpload.mediaKey,
	});

	await conn.relayMessage(
		m.chat,
		{
			messageContextInfo: { messageSecret: crypto.randomBytes(32) },
			stickerPackMessage: {
				stickerPackId: 'Pack_' + crypto.randomBytes(8).toString('hex'),
				name: meta.name,
				publisher: meta.publisher,
				packDescription: meta.description,
				stickers: stickersMetadata,
				fileLength: packUpload.fileLength,
				fileSha256: packUpload.fileSha256,
				fileEncSha256: packUpload.fileEncSha256,
				mediaKey: packUpload.mediaKey,
				directPath: packUpload.directPath,
				mediaKeyTimestamp: Math.floor(Date.now() / 1000),
				stickerPackSize: packUpload.fileLength,
				stickerPackOrigin: 2,
				trayIconFileName,
				thumbnailDirectPath: thumbUpload.directPath,
				thumbnailSha256: thumbUpload.fileSha256,
				thumbnailEncSha256: thumbUpload.fileEncSha256,
				thumbnailHeight: 252,
				thumbnailWidth: 252,
				imageDataHash: thumbUpload.fileSha256.toString('base64'),
			},
		},
		{ quoted: m }
	);
}


let handler = async (m, { conn, text, usedPrefix, command }) => {
	if (!text) {
		throw (
			`⚙️ *FORMAT SALAH!*\n\n` +
			`Gunakan:\n*${usedPrefix}${command} <link_atau_nama_pack_telegram> | <author>*\n\n` +
			`Contoh:\n` +
			`• *${usedPrefix}${command} https://t.me/addstickers/CatMemes*\n` +
			`• *${usedPrefix}${command} CatMemes | Lynna*`
		);
	}

	const token = global.tgToken;
	if (!token) throw '❌ global.tgToken belum diisi di config.js';

	let [packInput, authorInput] = text.split('|').map((v) => v?.trim());
	const customAuthor = authorInput || global.author || 'LYNNA AI';
	const basePackName = global.namebot || 'LYNNA AI';

	const match = packInput.match(/(?:t\.me\/addstickers\/)?([a-zA-Z0-9_]+)\/?$/i);
	const packName = match?.[1];
	if (!packName) throw '⚙️ Link/nama sticker pack Telegram tidak valid!';

	try {
		m.react('⏳');

		const res = await fetch(`https://api.telegram.org/bot${token}/getStickerSet?name=${encodeURIComponent(packName)}`);
		if (!res.ok) throw new Error(`Gagal ambil data Telegram (status ${res.status}). Pastikan nama/link pack valid.`);

		const data = await res.json();
		if (!data.ok || !data.result?.stickers?.length) {
			m.react('❌');
			return m.reply(`❌ Sticker pack Telegram *${packName}* tidak ditemukan atau kosong!`);
		}

		const stickers = data.result.stickers.filter((s) => !s.is_animated);
		if (!stickers.length) {
			m.react('❌');
			return m.reply('❌ Pack ini isinya stiker animasi Lottie (.tgs) semua, belum didukung.');
		}

		const skipped = data.result.stickers.length - stickers.length;
		const packTitle = data.result.title || packName;
		const totalPacks = Math.ceil(stickers.length / MAX_PACK_SIZE);

		await m.reply(
			`⏳ *Memproses sticker pack Telegram (${packTitle})...*\n` +
				`📊 *Total Stiker:* ${stickers.length}${skipped ? ` (${skipped} animasi .tgs dilewati)` : ''}\n` +
				`📦 *Total Pack:* ${totalPacks} (maks. ${MAX_PACK_SIZE} stiker/pack)`
		);

		const processSticker = async (st) => {
			try {
				const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${st.file_id}`);
				const fileData = await fileRes.json();
				if (!fileData.ok || !fileData.result?.file_path) return null;

				const filePath = fileData.result.file_path;
				const bufRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
				if (!bufRes.ok) return null;
				const buffer = Buffer.from(await bufRes.arrayBuffer());

				if (filePath.endsWith('.webm')) {
					const webpBuf = await videoToWebp({ data: buffer, ext: 'webm' }).catch(() => null);
					if (!webpBuf) return null;
					const withExif = await addExif(webpBuf, basePackName, customAuthor).catch(() => webpBuf);
					return { buffer: withExif, ext: 'webp', isAnimated: true, mimetype: 'image/webp' };
				}

				const sharp = await loadSharp();
				const webp = await sharp(buffer, { animated: false })
					.resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
					.webp({ quality: 60, effort: 4 })
					.toBuffer()
					.catch(() => buffer);
				const withExif = await addExif(webp, basePackName, customAuthor).catch(() => webp);
				return { buffer: withExif, ext: 'webp', isAnimated: false, mimetype: 'image/webp' };
			} catch (err) {
				console.error('[STICKETELE ITEM ERROR]', err.message);
				return null;
			}
		};

		let successPacks = 0;

		for (let p = 0; p < totalPacks; p++) {
			const slice = stickers.slice(p * MAX_PACK_SIZE, (p + 1) * MAX_PACK_SIZE);
			const processed = [];

			for (let i = 0; i < slice.length; i += CONCURRENCY) {
				const results = await Promise.all(slice.slice(i, i + CONCURRENCY).map(processSticker));
				for (const r of results) if (r) processed.push(r);
			}

			if (!processed.length) continue;

			const label = totalPacks > 1 ? ` Part ${p + 1}/${totalPacks}` : '';
			await sendCustomStickerPack(conn, m, processed, {
				name: `${basePackName} - ${packTitle}${label}`,
				publisher: customAuthor,
				description: packTitle + label,
			});
			successPacks++;

			if (p < totalPacks - 1) await new Promise((r) => setTimeout(r, 1000));
		}

		if (!successPacks) {
			m.react('❌');
			return m.reply('❌ Gagal mengunduh atau mengkonversi stiker dari pack tersebut.');
		}

		m.react('✅');
	} catch (e) {
		console.error('[STICKETELE ERROR]', e);
		m.react('❌');
		return m.reply(`❌ Gagal memproses sticker pack Telegram!\n${e.message || e}`);
	}
};

handler.help = ['sticketele <link/nama>', 'stiktele <link/nama>'];
handler.tags = ['sticker'];
handler.command = /^(sticketele|stiktele)$/i;
handler.limit = true;

export default handler;
