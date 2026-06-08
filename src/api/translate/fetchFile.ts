import axios from "axios";
import { log } from "../../utils/log";

export const fetchFile = async (fileUrl: string) => {
  try {
    const result = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const buffer = Buffer.from(result.data);
    log(`[fetchFile] downloaded ${buffer.length} bytes`);

    return buffer.toString("utf-8");
  } catch (error) {
    log("[fetch file] cant get file");
  }
};
