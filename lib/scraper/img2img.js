import axios from "axios";
import FormData from "form-data";
import config from "../../config.js";

const FCSI_API = "https://fgsi.dpdns.org/api/ai/image/img2img";

async function Uguu(buffer, filename) {
  const form = new FormData();
  form.append("files[]", buffer, { filename, contentType: "image/png" });

  const res = await axios.post("https://uguu.se/upload.php", form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  if (res.data?.files?.[0]?.url) {
    return res.data.files[0].url;
  }

  throw new Error("Upload ke Uguu gagal");
}

async function Img2Img(prompt, imageBuffer, filename = "upload.png") {
  const imageUrl = await Uguu(imageBuffer, filename);

  const apiKey = config.APIkey?.fgsi || "";
  const startUrl = `${FCSI_API}?apikey=${apiKey}&prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`;

  const start = await axios.get(startUrl, { timeout: 30000 });

  const pollUrl = start.data?.data?.pollUrl;
  if (!pollUrl) {
    return {
      status: false,
      error: start.data?.error || "Gagal memulai proses img2img",
    };
  }

  let result = null;
  const maxAttempts = 60;

  for (let i = 0; i < maxAttempts; i++) {
    const poll = await axios.get(pollUrl, { timeout: 30000 });

    if (!poll.data?.status) {
      return { status: false, error: "Polling gagal" };
    }

    if (poll.data.data?.status === "Success") {
      result = poll.data.data.result;
      break;
    }

    if (poll.data.data?.status === "Failed") {
      return { status: false, error: "Proses img2img gagal" };
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!result) {
    return { status: false, error: "Timeout menunggu hasil" };
  }

  return { status: true, prompt, imageUrl, result };
}

export { Img2Img };
