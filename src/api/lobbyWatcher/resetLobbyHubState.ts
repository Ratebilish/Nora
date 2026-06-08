import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
} from "discord.js";
import { startGameButtonDefault } from "../../components/buttons/startGame";
import { unhostGameButtonDefault } from "../../components/buttons/unhostGame";
import { buttonId } from "../../utils/globals";
import { log } from "../../utils/log";
import { resolveButton } from "../../utils/resolveComponent";
import { sleep } from "../../utils/sleep";

// discord.js v14: resolveComponent удалён — используем helper
// MessageActionRow → ActionRowBuilder, MessageButton → ButtonBuilder

export const resetLobbyHubState = async (
  message: any,
  delay: number = 2000
) => {
  await sleep(delay);

  const startButton =
    resolveButton(message as Message, buttonId.startGame) ||
    startGameButtonDefault();
  const unhostButton =
    resolveButton(message as Message, buttonId.unhostGame) ||
    unhostGameButtonDefault();

  try {
    const isSuccess = startButton.data.style === ButtonStyle.Success;
    await (message as Message).edit({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          isSuccess ? startButton : startGameButtonDefault(),
          isSuccess ? unhostButton : unhostButton.setDisabled(false)
        ),
      ],
    });
    log("[reset command hub] hub reset complete");
    return;
  } catch (err) {
    log("[reset command hub] cant edit msg");
    return;
  }
};
