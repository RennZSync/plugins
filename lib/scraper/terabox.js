import axios from "axios";

const CONFIG = {
  base: "https://flowvideoplayer.com",
  ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function TeraBoxDL(url) {
  try {
    const session = await axios.get(CONFIG.base, {
      headers: { "User-Agent": CONFIG.ua },
    });

    const rawCookies = session.headers["set-cookie"] || [];
    const cookieStr = rawCookies.map((c) => c.split(";")[0]).join("; ");
    const token = session.data.match(
      /name=["']csrf-token["']\s+content=["']([^"']+)["']/i,
    )?.[1];

    if (!token) {
      return { status: false, error: "CSRF Token not found" };
    }

    const response = await axios.post(
      `${CONFIG.base}/telegram/bot/search/video`,
      { url },
      {
        headers: {
          "User-Agent": CONFIG.ua,
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": token,
          "X-Requested-With": "XMLHttpRequest",
          Cookie: cookieStr,
          Origin: CONFIG.base,
          Referer: `${CONFIG.base}/`,
        },
      },
    );

    const result = response.data;
    if (result.error === false && result.data && result.data.length > 0) {
      const item = result.data[0];
      return {
        status: true,
        file_name: item.file_name,
        thumbnail: item.thumbnail,
        download_url: item.download_url,
        stream_url: item.stream_final_url || item.stream_url,
        file_size: item.file_size,
        file_size_bytes: item.file_size_bytes,
        duration: item.duration,
        extension: item.extension,
        share_url: item.share_url,
      };
    }

    return { status: false, error: "Tidak ada data ditemukan" };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { TeraBoxDL };
