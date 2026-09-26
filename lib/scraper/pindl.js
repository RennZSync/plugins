import axios from "axios";
import qs from "qs";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "id,en;q=0.9,en-GB;q=0.8,en-US;q=0.7",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://ilovepin.net",
  Referer: "https://ilovepin.net/id",
};

async function scrapePinterest(pinUrl) {
  try {
    const mainPage = await axios.get("https://ilovepin.net/id", {
      headers: {
        "User-Agent": headers["User-Agent"],
      },
    });
    const rawCookies = mainPage.headers["set-cookie"];
    const cookieString = rawCookies ? rawCookies.join("; ") : "";

    const dataBody = qs.stringify({
      url: pinUrl,
    });

    const { data } = await axios.post(
      "https://ilovepin.net/proxy.php",
      dataBody,
      {
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: cookieString,
        },
      },
    );

    if (!data.api || data.api.status !== "OK") {
      throw new Error("Gagal mengambil data atau URL tidak valid.");
    }

    const api = data.api;
    const items = api.mediaItems || [];

    const videos = items.filter((i) => i.type === "Video");
    const images = items.filter((i) => i.type === "Image");
    const audios = items.filter((i) => i.type === "Audio");

    const result = {
      title: api.title,
      description: api.description?.trim() || "-",
      author: {
        name: api.userInfo?.name,
        username: api.userInfo?.username,
        avatar: api.userInfo?.userAvatar,
      },
      stats: {
        likes: api.mediaStats?.likesCount,
        shares: api.mediaStats?.sharesCount,
      },
      media: [],
    };

    if (videos.length > 0) {
      videos.sort((a, b) => {
        const sizeA =
          parseFloat(a.mediaFileSize) *
          (a.mediaFileSize.includes("MB") ? 1024 : 1);
        const sizeB =
          parseFloat(b.mediaFileSize) *
          (b.mediaFileSize.includes("MB") ? 1024 : 1);
        return sizeB - sizeA;
      });

      result.media = videos.map((v) => ({
        type: "video",
        quality: v.mediaQuality === "HD" ? "HD" : `SD (${v.mediaRes})`,
        extension: v.mediaExtension,
        size: v.mediaFileSize,
        url: v.mediaUrl,
      }));
    } else if (images.length > 0) {
      result.media = images.map((img) => ({
        type: "image",
        quality: "Original",
        extension: img.mediaExtension,
        size: img.mediaFileSize,
        url: img.mediaUrl,
      }));
    }

    return result;
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

export default scrapePinterest;
// useage
// const url = 'https://id.pinterest.com/pin/87186942777228203/';

// scrapePinterest(url).then(res => {
//   if (res) {
//     console.log(JSON.stringify(res, null, 2));
//   }
// });
// /* respon
// {
//   "title": "heyeeog's Media",
//   "description": "-",
//   "author": {
//     "name": "H",
//     "username": "heyeeog",
//     "avatar": "https://s15.mcontent.app/v3/v/image/87187080194607525/87187080194607525/332c572b8c60be6f9e8ab9fd43b61aa5.jpg?token=1767599492ea8665974d03f7b699e59d60b56aa13e"
//   },
//   "stats": {
//     "likes": "1K",
//     "shares": "40K"
//   },
//   "media": [
//     {
//       "type": "video",
//       "quality": "HD",
//       "extension": "MP4",
//       "size": "2.16 MB",
//       "url": "https://s15.mcontent.app/v3/videoProcess/87186942777228203/280d107da6300ddd5613860656fd53d6/720p"
//     },
//     {
//       "type": "video",
//       "quality": "SD (648x1152)",
//       "extension": "MP4",
//       "size": "1.66 MB",
//       "url": "https://s15.mcontent.app/v3/videoProcess/87186942777228203/c974343bf779666b9547b76bf0586c7d/648p"
//     },
//     {
//       "type": "video",
//       "quality": "SD (486x864)",
//       "extension": "MP4",
//       "size": "1.16 MB",
//       "url": "https://s15.mcontent.app/v3/videoProcess/87186942777228203/02f0e7df39aa43abb41cf3a8925327f9/486p"
//     },
//     {
//       "type": "video",
//       "quality": "SD (360x640)",
//       "extension": "MP4",
//       "size": "760.32 KB",
//       "url": "https://s15.mcontent.app/v3/videoProcess/87186942777228203/fbc3c1f0361573d1334cdadfe26e8ba4/360p"
//     },
//     {
//       "type": "video",
//       "quality": "SD (234x416)",
//       "extension": "MP4",
//       "size": "394.04 KB",
//       "url": "https://s15.mcontent.app/v3/videoProcess/87186942777228203/ef58218a30aa8e6842e86b7ec9d8c9e0/234p"
//     }
//   ]
// }
// */
