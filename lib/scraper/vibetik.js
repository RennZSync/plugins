import axios from 'axios'

export async function vibetik(url) {
  try {
    if (!/tiktok\.com/.test(url)) throw new Error('URL TikTok tidak valid.')

    const { data } = await axios.get('https://vibetik.net/api/v2/tiktok/info', {
      headers: {
        'user-agent': 'okhttp/4.12.0',
        'x-api-key': 'vtk_m0b1l3_2026_pr0d'
      },
      params: { url }
    })

    return data
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message)
  }
}
