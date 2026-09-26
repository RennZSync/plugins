import axios from "axios"
import FormData from 'form-data'
import fs from 'fs'
async function upload(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("type", 13);
  form.append("scaleRadio", 2);
  
  const headers = {
    ...form.getHeaders(),
    "accept": "application/json, text/plain, */*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "origin": "https://imglarger.com",
    "priority": "u=1, i",
    "referer": "https://imglarger.com/",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36"
  };
  
  const { data } = await axios.post(
    "https://photoai.imglarger.com/api/PhoAi/Upload",
    form,
    { headers }
  );
  
  return data.data;
}

async function get(code) {
  const headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    "origin": "https://imglarger.com",
    "priority": "u=1, i",
    "referer": "https://imglarger.com/",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36"
  };
  
  const payload = { code, type: 13 };
  
  const { data } = await axios.post(
    "https://photoai.imglarger.com/api/PhoAi/CheckStatus",
    payload,
    { headers }
  );
  
  return data.data;
}

export { upload, get }