import translate from "google-translate-api-x";
import { log } from "../../utils/log";

const sanitizeForWc3 = (text: string): string => {
  return text.replace(/\r?\n/g, " ");
};

export const translateDeepL = async (
  texts: string[],
  targetLang: string,
  _sourceLang?: string
): Promise<string[] | null> => {
  try {
    const targetCode = targetLang.toLowerCase();

    const results = await translate(texts, {
      to: targetCode,
      autoCorrect: false,
      forceBatch: true,
      rejectOnPartialFail: false,
    });

    if (!results || !Array.isArray(results)) return null;

    return results.map((r: any, i: number) => {
      if (!r || !r.text) return texts[i];
      return sanitizeForWc3(r.text);
    });
  } catch (error: any) {
    log("[google-translate] error", error.message || error);
    return null;
  }
};
