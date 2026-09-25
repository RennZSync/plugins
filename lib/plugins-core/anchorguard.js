/**
 * config.js
 * global.antibug = {
 * enabled: true, // guard anti force-close aktif dari awal
 * guardOutgoing: false,
 * deleteMode: 'auto', // 'auto' | 'everyone' | 'me'
 * blockOnBug: false,
 * notifyOwner: false,};
 *
 * main.js/handler.js
 * import { attachAntiBug } from './lib/core/attachAntiBug.js';
 */

let handler = async (m, { conn, args, usedPrefix, command }) => {
	const who = conn.user.jid;
	global.db.data.settings[who] = global.db.data.settings[who] || {};
	const settings = global.db.data.settings[who];
	settings.antibug = { ...global.antibug, ...(settings.antibug || {}) };
	const cfg = settings.antibug;

	const sub = (args[0] || '').toLowerCase();
	const val = (args[1] || '').toLowerCase();

	const statusText = () =>
		[
			'🛡️ *Status Lynna AnchorGuard*',
			'',
			`Aktif          : ${cfg.enabled ? 'ON ✅' : 'OFF ❌'}`,
			`Jaga keluar    : ${cfg.guardOutgoing ? 'ON ✅' : 'OFF ❌'}`,
			`Mode hapus     : ${cfg.deleteMode}`,
			`Block pengirim : ${cfg.blockOnBug ? 'ON ✅' : 'OFF ❌'}`,
			`Notif ke owner : ${cfg.notifyOwner ? 'ON ✅' : 'OFF ❌'}`,
			'',
			`Gunakan:\n${usedPrefix}${command} on/off\n${usedPrefix}${command} outgoing on/off\n${usedPrefix}${command} block on/off\n${usedPrefix}${command} notif on/off\n${usedPrefix}${command} delete auto/everyone/me`,
		].join('\n');

	if (!sub || sub === 'status') {
		return conn.reply(m.chat, statusText(), m);
	}

	if (sub === 'on' || sub === 'off') {
		cfg.enabled = sub === 'on';
		global.attachAntiBug(conn);
		return conn.reply(m.chat, `Lynna AnchorGuard sekarang: ${cfg.enabled ? 'ON ✅' : 'OFF ❌'}`, m);
	}

	if (sub === 'outgoing' && (val === 'on' || val === 'off')) {
		cfg.guardOutgoing = val === 'on';
		global.attachAntiBug(conn);
		return conn.reply(
			m.chat,
			`Jaga pesan keluar sekarang: ${cfg.guardOutgoing ? 'ON ✅' : 'OFF ❌'}${
				cfg.guardOutgoing ? '\n⚠️ Kalau ada fitur (quotedfake/quotedOrder/dll) tiba-tiba error, coba matiin lagi ini.' : ''
			}`,
			m
		);
	}

	if (sub === 'block' && (val === 'on' || val === 'off')) {
		cfg.blockOnBug = val === 'on';
		global.attachAntiBug(conn);
		return conn.reply(m.chat, `Auto-block pengirim bug sekarang: ${cfg.blockOnBug ? 'ON ✅' : 'OFF ❌'}`, m);
	}

	if (sub === 'notif' && (val === 'on' || val === 'off')) {
		cfg.notifyOwner = val === 'on';
		return conn.reply(m.chat, `Notif ke owner sekarang: ${cfg.notifyOwner ? 'ON ✅' : 'OFF ❌'}`, m);
	}

	if (sub === 'delete' && ['auto', 'everyone', 'me'].includes(val)) {
		cfg.deleteMode = val;
		global.attachAntiBug(conn);
		return conn.reply(m.chat, `Mode hapus pesan diganti ke: ${val}`, m);
	}

	return conn.reply(m.chat, statusText(), m);
};

handler.help = ['antibug', 'antibug <on/off/outgoing/block/notif/delete>'];
handler.tags = ['owner'];
handler.command = ['antibug', 'anchorguard'];
handler.owner = true;

export default handler;
