import sharp from "sharp";
import path from "node:path";

const handler = async (m, {
  conn,
  args
}) => {
  const PIXEL_LEVEL = args[0] ? parseInt(args[0]) : 20;

  let img;
  if (m.quoted?.mimetype?.startsWith("image")) {
    img = m.quoted;
  } else if (m.mimetype?.startsWith("image")) {
    img = m;
  } else {
    return m.reply("Kirim/reply gambar dulu 🖼️");
  }

  await m.reply("⏳ Lagi diproses...");

  try {
    const buffer = await img.download();

    function getBlock(level) {
      const value = Math.min(Math.max(Number(level) || 12, 1), 40);
      return 41 - value;
    }

    const image = sharp(buffer, {
      limitInputPixels: false
    }).rotate().ensureAlpha();
    const meta = await image.metadata();

    const width = meta.width;
    const height = meta.height;
    const block = getBlock(PIXEL_LEVEL);

    const input = await image.raw().toBuffer();
    const output = Buffer.alloc(input.length);

    for (let y = 0; y < height; y += block) {
      for (let x = 0; x < width; x += block) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        const maxY = Math.min(y + block, height);
        const maxX = Math.min(x + block, width);

        for (let yy = y; yy < maxY; yy++) {
          for (let xx = x; xx < maxX; xx++) {
            const i = (yy * width + xx) * 4;
            r += input[i];
            g += input[i + 1];
            b += input[i + 2];
            a += input[i + 3];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        a = Math.round(a / count);

        for (let yy = y; yy < maxY; yy++) {
          for (let xx = x; xx < maxX; xx++) {
            const i = (yy * width + xx) * 4;
            output[i] = r;
            output[i + 1] = g;
            output[i + 2] = b;
            output[i + 3] = a;
          }
        }
      }
    }

    const result = await sharp(output, {
        raw: {
          width,
          height,
          channels: 4
        }
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: false
      })
      .toBuffer();

    await conn.sendMessage(m.chat, {
      image: result,
      caption: `✅ Pixel art selesai!\n📊 Level: ${PIXEL_LEVEL}/40\n🔲 Block size: ${block}px`
    }, {
      quoted: m
    });

  } catch (e) {
    m.reply(`❌ Gagal: ${e.message}`);
  }
};

handler.help = ["pixelart [level]"];
handler.tag = ["tools", "image"];
handler.command = /^pixelart$/i;

export default handler;
