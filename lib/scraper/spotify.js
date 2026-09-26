import axios from "axios";

async function downloadSpotify(spotifyUrl) {
  try {
    const response = await axios.post(
      "https://spotyloader.com/api/spotify/track",
      { url: spotifyUrl },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://spotyloader.com/",
          Origin: "https://spotyloader.com",
        },
      },
    );

    const data = response.data;
    if (data.downloadLink) {
      console.log(
        `Judul  : ${data.post.name}\nArtis  : ${data.post.artist}\nFormat : ${data.post.mime}\nLink   : ${data.downloadLink}`,
      );
    } else {
      console.log("[!] Gagal mendapatkan link:", data);
    }
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
  }
}

downloadSpotify(
  process.argv[2] || "https://open.spotify.com/track/1XabvPK1VQEH4YqzDovs46",
);
