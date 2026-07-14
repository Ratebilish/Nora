import { sendCommand } from "../../utils/requestToGuiServer";
import { sleep } from "../../utils/sleep";

// GHost нумерует слоты (SID) с 1, а весь внутренний расчёт свопов
// (parseRawSlots/getTeamRanges/computeSwaps в winrateShuffle.ts) работает
// с 0-индексированными позициями JS-массива — конвертируем именно здесь,
// на границе, где номер слота уходит в реальную команду GHost.
const toGhostSlot = (internalSlot: number) => internalSlot + 1;

export const shuffleByWinrate = async (swaps: Array<[number, number]>) => {
  for (const [slotA, slotB] of swaps) {
    const marks = await sendCommand(
      `swap ${toGhostSlot(slotA)} ${toGhostSlot(slotB)}`
    );

    if (!marks) return null;

    await sleep(250);
  }

  return "success";
};
