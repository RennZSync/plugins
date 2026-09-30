import { delay, prepareWAMessageMedia } from 'baileys';

const urls = [
  'https://cdn.ornzora.eu.cc/aed35b3f-baf5-4c2e-9839-1a1188c5c44a-FIORA.jpg',
  'https://cdn.ornzora.eu.cc/4930f428-6661-4c17-a52c-2d48eff2f86d-FIORA.jpg',
  'https://cdn.ornzora.eu.cc/d4443125-d672-4034-972c-04b73969b359-FIORA.jpg',
  'https://cdn.ornzora.eu.cc/59f8c79a-8274-4d61-a200-ea4a279b9e5d-FIORA.jpg',
  'https://cdn.ornzora.eu.cc/090f9baf-aaeb-4c79-8995-b3b541cef444-FIORA.jpg'
];

let handler = async (m, { conn, command }) => {
  const { key } = await m.reply('Loading...');

  const link = 'https://tiktok.com/@rennz_dev';
  const title = 'RenZSync';
  const description = `© 𝐋𝐘𝐍𝐍𝐀 𝐀𝐈`;
  const text = `𝐋𝐘𝐍𝐍𝐀 𝐀𝐈`;

  if (command === 'tmte') {
    const thumbs = await Promise.all(
      urls.map(async url =>
        Toolkit.resize(await Toolkit.fetchBuffer(url), 300, 300)
      )
    );
    
    for(let i = 0; i < 5; i++) {
	    for (const jpegThumbnail of thumbs) {
	      await conn.sendMessage(m.chat, {
			  edit: key,
			  text: text.includes(link) ? text : `${link}\n${text}`,
			  linkPreview: {
				'matched-text': link,
			    title, 
			    description, 
			    jpegThumbnail
			  }
			})
	
	      await delay(1500);
	    }
    }

    return;
  }

  const medias = await Promise.all(
    urls.map(async url => {
      const { imageMessage } = await prepareWAMessageMedia(
        {
          image: { url }
        },
        {
          upload: conn.waUploadToServer,
          mediaTypeOverride: 'thumbnail-link'
        }
      );

      return imageMessage;
    })
  );
  
  for(let i = 0; i < 5; i++) {
	  for (const image of medias) {
	    await conn.sendMessage(
	      m.chat,
	      {
	        edit: key,
	        text: text.includes(link) ? text : `${link}\n${text}`,
	        linkPreview: {
	          'matched-text': link,
	          title,
	          description,
	          jpegThumbnail: image.jpegThumbnail,
	          highQualityThumbnail: image
	        }
	      }
	    );
	
	    await delay(2000);
	  }
  }
};

handler.help = ['tmte', 'tmte2'];
handler.command = ['tmte', 'tmte2'];
handler.tags = ['other'];

export default handler;
