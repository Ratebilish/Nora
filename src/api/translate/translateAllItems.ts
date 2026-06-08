import { log } from "../../utils/log";
import { sleep } from "../../utils/sleep";
import { translateDeepL } from "../deepl/translateDeepL";

const maxLengthPerRequest = 5000;
const maxTextsPerRequest = 500;
const maxRequestPerSecond = 3;
const retryAttempts = 3;
const retryDelay = 3000;

export const translateAllItems = async (
  data: DataToTranslate,
  target: string
) => {
  const translationGroups = getTranslationRequestGroups(data.itemList);
  const totalGroups = translationGroups.length;
  const totalItems = data.itemList.length;
  const totalChars = data.itemList.reduce((sum, [, v]) => sum + v.length, 0);

  log(`[translate] ${totalItems} items, ${totalGroups} groups, ~${totalChars} chars`);

  const results: string[] = [];
  let batchNum = 0;
  let failedGroups = 0;

  while (translationGroups.length > 0) {
    const requestGroups = translationGroups.splice(0, maxRequestPerSecond);
    batchNum++;

    log(`[translate] batch ${batchNum} — ${requestGroups.length} groups (${translationGroups.length} remaining)`);

    const groupTranslateResult = await Promise.all(
      requestGroups.map(async (group) => {
        const result = await translateGroupWithRetry(group, target);
        if (result.failed) failedGroups++;
        return result.texts;
      })
    );

    for (const groupResult of groupTranslateResult) {
      results.push(...groupResult);
    }

    if (translationGroups.length > 0) {
      await sleep(1500);
    }
  }

  if (failedGroups > 0) {
    log(`[translate] WARNING: ${failedGroups}/${totalGroups} groups failed`);
  }

  if (results.length !== totalItems) {
    log(`[translate] ERROR: expected ${totalItems} translations, got ${results.length}`);
  }

  log(`[translate] done — ${results.length}/${totalItems} strings processed`);
  return results;
};

const translateGroupWithRetry = async (
  textGroup: string[],
  target: string
): Promise<{ texts: string[]; failed: boolean }> => {
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const result = await translateDeepL(textGroup, target);

      if (result && result.length === textGroup.length) {
        return { texts: result, failed: false };
      }

      if (result && result.length !== textGroup.length) {
        log(`[translate] DeepL returned ${result.length} texts, expected ${textGroup.length}`);
      }

      if (attempt < retryAttempts) {
        log(`[translate] group failed, retry ${attempt}/${retryAttempts - 1}...`);
        await sleep(retryDelay);
      }
    } catch (error) {
      if (attempt < retryAttempts) {
        log(`[translate] group error, retry ${attempt}/${retryAttempts - 1}...`);
        await sleep(retryDelay);
      }
    }
  }

  log(`[translate] group failed after ${retryAttempts} attempts (${textGroup.length} texts) — keeping original`);
  return { texts: textGroup, failed: true };
};

export const getTranslationRequestGroups = (
  text: DataToTranslate["itemList"]
) => {
  const messageGroups = text.reduce(
    (data, item, index) => {
      const [_, value] = item;
      const currentLength =
        getArrayTotalLength(data.currentGroup) + value.length;
      const currentCount = data.currentGroup.length;

      if (currentLength >= maxLengthPerRequest || currentCount >= maxTextsPerRequest) {
        if (data.currentGroup.length > 0) {
          data.groups.push(data.currentGroup);
          data.currentGroup = [];
        }
      }

      const isLastItem = index + 1 === text.length;

      if (isLastItem) {
        data.groups.push([...data.currentGroup, value]);
        data.currentGroup = [];
        return data;
      }

      data.currentGroup.push(value);
      return data;
    },
    {
      groups: [] as Array<Array<string>>,
      currentGroup: [] as string[],
    }
  );
  return messageGroups.groups;
};

export const getArrayTotalLength = (arr: string[]) => {
  return arr.reduce((totalLength, item) => totalLength + item.length, 0);
};
