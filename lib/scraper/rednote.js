import axios from "axios";

const generateRandomIP = () =>
  Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join(".");

async function RedNoteDL(xhsUrl) {
  const fakeIP = generateRandomIP();

  const response = await axios.post(
    "https://rednote.savevideodown.com/api/download",
    { url: xhsUrl },
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Referer: "https://rednote.savevideodown.com/",
        Origin: "https://rednote.savevideodown.com",
        "X-Forwarded-For": fakeIP,
        "X-Real-IP": fakeIP,
        "Client-IP": fakeIP,
      },
    },
  );

  const resData = response.data;

  if (!resData.success) {
    return {
      status: false,
      error: resData.error || "Gagal mengambil data",
    };
  }

  return {
    status: true,
    title: resData.title,
    author: resData.author,
    type: resData.type,
    results:
      resData.type === "video"
        ? [resData.directVideoUrl || resData.downloadUrl]
        : resData.directImages || [],
  };
}

export { RedNoteDL };
