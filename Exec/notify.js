// notify ai & share contact 
> await conn.relayMessage(m.chat, { protocolMessage: { type: 11 }, messageContextInfo: { botMetadata: { sessionTransparencyMetadata: { disclaimerText: "Ini adalah ghost notif murni dari sistem.", hcaId: "hca_" + Date.now(), sessionTransparencyType: 1 } } } }, {})


// notify ai pure 
> await conn.relayMessage(m.chat, { albumMessage: {}, messageContextInfo: { botMetadata: { sessionTransparencyMetadata: { disclaimerText: "Teks gaib", hcaId: "hca_" + Date.now(), sessionTransparencyType: 1 } } } }, { additionalAttributes: { type: 'text' } })

// notify ai no album mesek 
> conn.relayMessage(m.chat,{messageContextInfo:{botMetadata:{sessionTransparencyMetadata:{sessionTransparencyType:1}}},reactionMessage:{key:m.key,text:'',senderTimestampMs:Date.now()}},{})


// requestPhoneNumber
> for (let i = 0; i < 2; i++) {
  await sock.sendMessage(m.chat, {
    requestPhoneNumber: {}
  })
  await new Promise(r => setTimeout(r, 1000))
}


// comboo
> (async () => {
    for (let i = 1; i <= 3; i++) {
        await conn.relayMessage(m.chat, { 
            protocolMessage: { type: 11 }, 
            messageContextInfo: { 
                botMetadata: { 
                    sessionTransparencyMetadata: { 
                        disclaimerText: "Ini adalah ghost notif murni dari sistem.", 
                        hcaId: `hca_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`, 
                        sessionTransparencyType: 1 
                    } 
                } 
            } 
        }, {});
        if (i < 5) await new Promise(r => setTimeout(r, 1000));
    }
})()