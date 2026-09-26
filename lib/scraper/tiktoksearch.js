import axios from 'axios'

const TTSEARCH_API = 'https://api.azbry.com/api/search/ttsearch?q='

function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return null
    const matches = url.match(/https?:\/\//g) || []
    if (matches.length <= 1) return url
    const lastIndex = url.lastIndexOf('http')
    return url.slice(lastIndex)
}

function normalizeNumber(value) {
    const number = Number(value)
    return Number.isFinite(number) ? number : 0
}

function normalizeItem(item) {
    return {
        title: item?.title || '',
        cover: normalizeUrl(item?.cover),
        originCover: normalizeUrl(item?.origin_cover),
        link: normalizeUrl(item?.link),
        watermarkLink: normalizeUrl(item?.watermark_link),
        music: normalizeUrl(item?.music),
        author: {
            nickname: item?.author?.nickname || '',
            avatar: normalizeUrl(item?.author?.avatar)
        },
        stats: {
            plays: normalizeNumber(item?.stats?.plays),
            likes: normalizeNumber(item?.stats?.likes),
            comments: normalizeNumber(item?.stats?.comments),
            shares: normalizeNumber(item?.stats?.shares)
        }
    }
}

async function tiktokSearchVideo(query) {
    const { data } = await axios.get(`${TTSEARCH_API}${encodeURIComponent(query)}`, {
        timeout: 30000,
        headers: {
            'user-agent': 'Mozilla/5.0'
        }
    })

    if (!data?.status || !Array.isArray(data?.result)) {
        throw new Error(data?.message || 'TikTok search gagal')
    }

    return data.result.map(normalizeItem).filter((item) => item.link)
}

export { tiktokSearchVideo }
