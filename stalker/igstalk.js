/** 
 * ig stalk 
 * Sources: https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c (RennZSync)
 * Type Plugin ESM
 * 
 * RennZSync 
 * By Snøwi
 * ubah wm atau apus wm yatim
*/

import axios from 'axios';
import { AIRich } from '../../lib/ui/MessageBuilder.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Masukkan username Instagram target!\n\n*Contoh:* ${usedPrefix + command} rennz_dev`;

    const cleanUsername = text.replace(/[@\s]/g, '').toLowerCase();

    let profile = {
        fullName: cleanUsername,
        profilePic: "https://raw.githubusercontent.com/himanackerman/Image/main/anu/1790145577832-138337d7.jpg",
        isVerified: true
    };

    try {
        const { data } = await axios.get(`https://api.vreden.web.id/api/igstalk?username=${cleanUsername}`, {
            timeout: 10000
        });

        if (data && data.result) {
            profile = {
                fullName: data.result.fullName || data.result.name || cleanUsername,
                profilePic: data.result.avatar || data.result.profilePic || profile.profilePic,
                isVerified: Boolean(data.result.isVerified || data.result.is_verified)
            };
        }
    } catch (err) {
        console.error(`[IG Lookup Error] Fetch gagal untuk ${cleanUsername}, menggunakan data default.`);
    }

    const rennzsync = new AIRich(conn);
    rennzsync.addCompact({
        title: "RennZSync ig stlak",
        subtitle: "RennZSync",
        secondary_subtitle: "",
        image: profile.profilePic,
        entity_id: cleanUsername,
        entity_url: "https://whatsapp.com/channel/0029VbCJ0B0K0IBlYlYJ0W3c",
        entity_type: "WEBSITE",
        action_type: "OPEN_URL",
        is_verified: profile.isVerified
    });

    rennzsync.addSection({
        view_model: {
            primitives: [
                { type: "HORIZONTAL_LINE", __typename: "GenAIDividerPrimitive" }
            ],
            __typename: "GenAIVStackLayoutViewModel"
        }
    });

    rennzsync.addSection({
        view_model: {
            primitives: [
                { __typename: "GenAISpacerPrimitive" },
                {
                    text: "# {{social_entity_1}}See results\0{{/social_entity_1}}",
                    inline_entities: [
                        {
                            key: "social_entity_1",
                            metadata: {
                                __typename: "GenAISocialEntityItem",
                                entity_id: cleanUsername,
                                entity_name: cleanUsername,
                                entity_full_name: profile.fullName,
                                entity_picture_url: profile.profilePic,
                                entity_url: `https://www.instagram.com/${cleanUsername}`,
                                entity_type: "IG_PROFILE",
                                is_verified: profile.isVerified
                            }
                        }
                    ],
                    __typename: "GenAIMarkdownTextUXPrimitive"
                },
                { __typename: "GenAISpacerPrimitive" }
            ],
            __typename: "GenAIActionRowLayoutViewModel"
        }
    });
    await rennzsync.send(m.chat);
};

handler.help = ['instalookup <username>', 'igstalk <username>'];
handler.tags = ['tools', 'stalker'];
handler.command = /^(instalookup|igstalk|instalookupai)$/i;

export default handler;
