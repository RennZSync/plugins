import axios from "axios";
import fs from "fs";
async function upscaler(path) {
  try {
    const img = fs.readFileSync(path).toString("base64");

    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
      "Content-Type": "application/json",
      origin: "https://aienhancer.ai",
      referer: "https://aienhancer.ai/ai-image-upscaler",
    };

    const create = await axios.post(
      "https://aienhancer.ai/api/v1/r/image-enhance/create",
      {
        model: 3,
        image: `data:image/jpeg;base64,${img}`,
        settings: "kRpBbpnRCD2nL2RxnnuoMo7MBc0zHndTDkWMl9aW+Gw=",
      },
      { headers },
    );

    const id = create.data.data.id;

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2500));

      const result = await axios.post(
        "https://aienhancer.ai/api/v1/r/image-enhance/result",
        { task_id: id },
        { headers },
      );

      const data = result.data.data;

      if (data && data.output) {
        return {
          id,
          output: data.output,
          input: data.input,
        };
      }
    }
  } catch (e) {
    return { status: "error", msg: e.message };
  }
}

(async () => {
  console.log(await upscaler("./z.png"));
})();

export default upscaler;
