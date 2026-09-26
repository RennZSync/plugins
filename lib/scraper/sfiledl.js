import axios from 'axios'
import * as cheerio from 'cheerio'
async function sfile(url) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K)',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'id-ID,id;q=0.9,en;q=0.8'
  }

  const r1 = await axios.get(url, { headers })
  const cookie = (r1.headers['set-cookie'] || []).map(v => v.split(';')[0]).join('; ')
  if (cookie) headers.cookie = cookie

  let $ = cheerio.load(r1.data)

  const file_name = $('h1').first().text().trim() || null
  const size_from_text = r1.data.match(/(\d+(?:\.\d+)?\s?(?:KB|MB|GB))/i)?.[1] || null

  const infoText = $('meta[property="og:description"]').attr('content') || ''

  const author_name = infoText.match(/uploaded by\s([^ ]+)/i)?.[1] || null
  const upload_date = infoText.match(/on\s(\d+\s[A-Za-z]+\s\d{4})/i)?.[1] || null

  const download_count =
    $('span')
      .filter((_, el) => $(el).text().toLowerCase().includes('download'))
      .first()
      .text()
      .match(/\d+/)?.[0] || null

  const pageurl = $('meta[property="og:url"]').attr('content')
  if (!pageurl) {
    return {
      file_name,
      size_from_text,
      author_name,
      upload_date,
      download_count,
      download_url: null
    }
  }

  headers.referer = url
  const r2 = await axios.get(pageurl, { headers })
  $ = cheerio.load(r2.data)

  const gateUrl = $('#download').attr('href')
  if (!gateUrl) {
    return {
      file_name,
      size_from_text,
      author_name,
      upload_date,
      download_count,
      download_url: null
    }
  }

  headers.referer = pageurl
  const r3 = await axios.get(gateUrl, { headers })

  const scripts = cheerio
    .load(r3.data)('script')
    .map((_, el) => cheerio.load(el).html())
    .get()
    .join('\n')

  const final = scripts.match(/https:\\\/\\\/download\d+\.sfile\.(?:co|mobi)\\\/downloadfile\\\/\d+\\\/\d+\\\/[a-z0-9]+\\\/[^"'\\\s]+(\?[^"']+)?/i)

  const download_url = final ? final[0].replace(/\\\//g, '/') : null

  return {
    file_name,
    size_from_text,
    author_name,
    upload_date,
    download_count,
    download_url
  }
}

export default sfile
// SAMPLE RESPONSE
// {
//   file_name: 'Spotify PREMIUM_9.1.14.864',
//   size_from_text: '100.42 MB',
//   author_name: 'Planetvdn',
//   upload_date: '22 January 2026',
//   download_count: '1',
//   download_url: 'https://download0426.sfile.co/downloadfile/2200881/724157/99f1f1d69f8fd931e1447af03be9cec0/spotify-premium_9.1.14.864.apk?k=8a782a007c623b62889412b2f5a49424'
// }
