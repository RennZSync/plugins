import axios from 'axios'
import * as cheerio from 'cheerio'
const client = axios.create({
  withCredentials: true,
  headers: {
    origin: "https://unrestrictedaiimagegenerator.com",
    referer: "https://unrestrictedaiimagegenerator.com/",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36",
  },
});

async function unrestrictedai(prompt, style = "anime") {
  const styles = [
    "photorealistic",
    "digital-art",
    "impressionist",
    "anime",
    "fantasy",
    "sci-fi",
    "vintage",
  ];

  if (!prompt) throw new Error("Prompt is required");
  if (!styles.includes(style))
    throw new Error(`Available styles: ${styles.join(", ")}`);

  const { data: html, headers } = await client.get(
    "https://unrestrictedaiimagegenerator.com/"
  );

  const cookies = headers["set-cookie"]?.join("; ");
  if (cookies) client.defaults.headers.Cookie = cookies;

  const $ = cheerio.load(html);
  const nonce = $('input[name="_wpnonce"]').val();
  if (!nonce) throw new Error("Nonce not found");

  const form = new URLSearchParams({
    generate_image: "true",
    image_description: prompt,
    image_style: style,
    _wpnonce: nonce,
  });

  const { data: resultHtml } = await client.post(
    "https://unrestrictedaiimagegenerator.com/",
    form.toString(),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    }
  );

  const $$ = cheerio.load(resultHtml);
  const img = $$("img#resultImage").attr("src");

  if (!img) throw new Error("Image not found");

  return img;
}

export default unrestrictedai