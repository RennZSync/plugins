import axios from "axios";
import CryptoJS from "crypto-js";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

class YouTubeSearch {
  constructor() {
    this.client = wrapper(axios.create({ jar: new CookieJar() }));
  }

  async search(query) {
    const { data: html } = await this.client.get("https://www.youtube.com/results", {
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      },
      params: { search_query: query }
    });

    const match = html?.match(/var ytInitialData = (\{[\s\S]*?\});/)
      || html?.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*var/);
    if (!match) throw new Error("Gagal parse YouTube data");
    return this._parseResults(JSON.parse(match[1]));
  }

  _parseResults(json) {
    const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
    if (!contents) return [];
    return contents
      .filter(c => c.videoRenderer)
      .map(c => {
        const d = c.videoRenderer;
        return {
          id: d.videoId,
          url: `https://www.youtube.com/watch?v=${d.videoId}`,
          title: d.title?.runs?.[0]?.text || "",
          author: d.ownerText?.runs?.[0]?.text || "",
          views: d.viewCountText?.simpleText || "",
          duration: d.lengthText?.accessibility?.accessibilityData?.label || "",
          thumbnail: d.thumbnail?.thumbnails?.pop()?.url || "",
          published: d.publishedTimeText?.simpleText || ""
        };
      });
  }
}

class SavetubeDownloader {
  constructor() {
    this.cryptoKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  }

  async _getCdn() {
    const { data } = await axios.get("https://media.savetube.vip/api/random-cdn");
    return data.cdn;
  }

  _decrypt(base64) {
    const raw = Buffer.from(base64, "base64");
    const iv = raw.slice(0, 16);
    const encrypted = raw.slice(16);
    const key = CryptoJS.enc.Hex.parse(this.cryptoKey);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.lib.WordArray.create(encrypted) },
      key,
      { iv: CryptoJS.lib.WordArray.create(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }

  async download(videoUrl, quality = "128") {
    const cdn = await this._getCdn();
    const { data } = await axios.post(`https://${cdn}/v2/info`, { url: videoUrl });
    if (!data.status) throw new Error(data.message || "Gagal ambil info video");

    const info = this._decrypt(data.data);
    const { data: dl } = await axios.post(`https://${cdn}/download`, {
      downloadType: "audio",
      quality,
      key: info.key
    });

    return {
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.durationLabel,
      downloadUrl: dl.data?.downloadUrl || "",
      format: "mp3"
    };
  }
}

class Ytmp3IngDownloader {
  async download(videoUrl) {
    const res = await axios.get("https://ytmp3.ing/");
    const cookie = res.headers["set-cookie"]?.join("; ") || "";
    const csrf = res.data.match(/value="([^"]+)"/)?.[1];
    if (!csrf) throw new Error("Gagal dapat CSRF token ytmp3.ing");

    const boundary = "----WebKitFormBoundaryAzbry";
    const body = `${boundary}\r\nContent-Disposition: form-data; name="url"\r\n\r\n${videoUrl}\r\n${boundary}--\r\n`;

    const response = await axios.post("https://ytmp3.ing/audio", body, {
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "x-csrftoken": csrf,
        cookie
      }
    });

    let encryptedUrl = response.data.url;
    const downloadUrl = Buffer.from(encryptedUrl, "base64").toString("utf-8");
    
    return {
      title: response.data.filename || "Unknown",
      downloadUrl,
      format: "mp3"
    };
  }
}

export async function ytmp3(query, { quality = "128" } = {}) {
  const searcher = new YouTubeSearch();
  const results = await searcher.search(query);
  if (!results.length) throw new Error("Tidak ada hasil pencarian");

  const video = results[0];
  const videoUrl = video.url;

  const backends = [
    { name: "savetube", fn: () => new SavetubeDownloader().download(videoUrl, quality) },
    { name: "ytmp3ing", fn: () => new Ytmp3IngDownloader().download(videoUrl) }
  ];

  let lastError;
  for (const backend of backends) {
    try {
      const result = await backend.fn();
      return {
        status: true,
        created_by: "Febry Wesker",
        backend: backend.name,
        video,
        download: result
      };
    } catch (err) {
      lastError = err;
      console.error(`[FALLBACK] ${backend.name} gagal: ${err.message}`);
    }
  }

  throw new Error(`Semua backend gagal. Error terakhir: ${lastError?.message}`);
}

if (process.argv[1] && (process.argv[1].endsWith("ytmp3.js") || process.argv[1] === "node")) {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.log("Usage: node ytmp3.js <query>");
    console.log('Example: node ytmp3.js "Semenjana - soegi bornean"');
    process.exit(0);
  }

  try {
    console.log(`[SEARCH] Mencari: "${query}"...`);
    const result = await ytmp3(query);
    console.log("\n========== RESULT ==========");
    console.log(JSON.stringify(result, null, 2));
    console.log("============================\n");
  } catch (err) {
    console.error("[ERROR]", err.message);
  }
}

export default ytmp3;
