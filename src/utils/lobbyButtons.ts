import { ActionRowBuilder, ButtonBuilder, Message } from "discord.js";
import { shuffleWinrateButtonDefault } from "../components/buttons/shuffleWinrate";
import { startGameButtonDefault } from "../components/buttons/startGame";
import { unhostGameButtonDefault } from "../components/buttons/unhostGame";
import { buttonId } from "./globals";
import { resolveButton, resolveButtonByPrefix } from "./resolveComponent";

export const getBotIdFromLobbyMessage = (message: Message): number | null => {
  const field = message.embeds[0]?.fields?.find((item) =>
    item.name?.startsWith("※ Game #")
  );

  if (!field?.name) return null;

  const botid = parseInt(field.name.replace(/[^\d]/g, ""), 10);

  return Number.isNaN(botid) ? null : botid;
};

type LobbyButtonsOptions = {
  message?: Message;
  botid: number;
  start?: ButtonBuilder;
  shuffle?: ButtonBuilder;
  unhost?: ButtonBuilder;
  rankingEnabled?: boolean;
  balanced?: boolean;
  slotsTaken?: number;
};

export const buildLobbyButtonRow = ({
  message,
  botid,
  start,
  shuffle,
  unhost,
  rankingEnabled = true,
  balanced = true,
  slotsTaken = 0,
}: LobbyButtonsOptions) => {
  const startButton =
    start ||
    (message ? resolveButton(message, buttonId.startGame) : null) ||
    startGameButtonDefault();
  const shuffleButton =
    shuffle ||
    (message ? resolveButtonByPrefix(message, buttonId.shuffleWinrate) : null) ||
    shuffleWinrateButtonDefault({ botid });
  const unhostButton =
    unhost ||
    (message ? resolveButton(message, buttonId.unhostGame) : null) ||
    unhostGameButtonDefault();

  // Кнопку старта блокируем, если лобби ranked и не сбалансировано по MMR —
  // кроме случаев, когда buildWinrateShufflePlan сам говорит "нечего
  // балансировать" (соло-игра, недостаточно игроков, ranking выключен и
  // т.п. — см. reason "not_enough_players"/"ranking_disabled" в
  // winrateShuffle.ts). Именно поэтому balanced по умолчанию true — вызывающая
  // сторона явно передаёт false только когда точно знает, что дисбаланс есть.
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    startButton.setDisabled(
      slotsTaken === 0 || (rankingEnabled && !balanced)
    ),
    shuffleButton.setDisabled(slotsTaken < 2 || !rankingEnabled),
    unhostButton
  );
};
