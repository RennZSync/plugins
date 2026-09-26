import axios from "axios"
async function scdl(url) {
    const base = 'https://convertico.com/';
    const endpoint = base + 'soundcloud-downloader/soundcloud-downloader.php';

    const headers = {
        'accept': '*/*',
        'origin': base,
        'referer': base + 'soundcloud-downloader/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const responseInfo = await axios.post(endpoint, new URLSearchParams({
            action: 'fetch',
            url: url
        }), { headers });

        const info = responseInfo.data;
        if (!info.status) throw new Error("Gagal mengambil info lagu");

        const responseDl = await axios.post(endpoint, new URLSearchParams({
            action: 'download',
            url: url,
            quality: '192',
            is_playlist: '0'
        }), { headers });

        const dl = responseDl.data;
        if (!dl.file_url) throw new Error("Gagal generate link download");

        const downloadUrl = base + 'soundcloud-downloader/' + dl.file_url.split('/').map(encodeURIComponent).join('/');

        return {
            title: info.title,
            uploader: info.author,
            duration: `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}`,
            views: info.view_count.toLocaleString(),
            likes: info.like_count.toLocaleString(),
            thumbnail: info.thumbnail,
            size: `${(dl.size / 1024 / 1024).toFixed(2)} MB`,
            format: dl.format,
            download_url: downloadUrl
        };
    } catch (err) {
        throw new Error(err.message);
    }
}

export default scdl;