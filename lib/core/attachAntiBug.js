// lib/core/attachAntiBug.js
// plugin ada di pluginns/owner
import { createAntiBugGuard } from './anchorguard.js';

const NOTIFY_COOLDOWN_MS = 30_000;
let lastNotifyAt = 0;

function getAntiBugSettings(conn) {
	const who = conn?.user?.jid;
	global.db.data.settings[who] = global.db.data.settings[who] || {};
	const settings = global.db.data.settings[who];
	settings.antibug = { ...global.antibug, ...(settings.antibug || {}) };
	return settings.antibug;
}

export function attachAntiBug(conn) {
	if (global.antibugGuard) {
		try {
			global.antibugGuard.stop();
		} catch {}
		global.antibugGuard = null;
	}

	const cfg = getAntiBugSettings(conn);
	if (!cfg.enabled) return null;

	const ownerNumber = (global.owner || [])[0]?.[0];
	const ownerJid = ownerNumber ? `${ownerNumber}@s.whatsapp.net` : null;

	global.antibugGuard = createAntiBugGuard(conn, {
		autoDelete: true,
		deleteMode: cfg.deleteMode || 'auto',
		guardIncoming: true,
		guardOutgoing: !!cfg.guardOutgoing,
		blockOnBug: !!cfg.blockOnBug,
		selfOnly: false,
		onDetect: async ({ direction, jid, sender, reasons }) => {
			const label = direction === 'incoming' ? `pesan masuk dari ${sender} di ${jid}` : `pesan keluar ke ${jid} diblokir`;
			console.log(`[antibug] ${label}: ${reasons.join(', ')}`);

			if (!cfg.notifyOwner || !ownerJid) return;

			const now = Date.now();
			if (now - lastNotifyAt < NOTIFY_COOLDOWN_MS) return; // masih cooldown, skip
			lastNotifyAt = now;

			try {
				await conn.sendMessage(ownerJid, {
					text: `🛡️ AnchorGuard - ${label}\nAlasan: ${reasons.join(', ')}`,
				});
			} catch (e) {
				console.log('[antibug] gagal kirim notif ke owner:', e.message);
			}
		},
	});

	return global.antibugGuard;
}

global.attachAntiBug = attachAntiBug;
