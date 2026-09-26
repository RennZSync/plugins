import https from 'https'
const API_KEY = "dac23a9006fc4039ae6aac98ae7c7b46"

function generateCustomTTS(speakerId, text) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: text,
      speaker: speakerId || "001526de-3826-11ee-a861-00163e2ac61b",
      emotion: "Happy"
    })

    const options = {
      hostname: "api.topmediai.com",
      path: "/v1/text2speech",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Content-Length": Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, res => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => {
        try {
          const json = JSON.parse(data)
          const audioUrl = json?.data?.oss_url
          if (!audioUrl) return reject(new Error("No audio URL"))
          resolve(audioUrl)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on("error", reject)
    req.write(postData)
    req.end()
  })
}

export default generateCustomTTS