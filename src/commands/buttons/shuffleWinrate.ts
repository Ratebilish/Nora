import { ButtonInteraction, Message } from "discord.js";
import { shuffleByWinrate } from "../../api/ghost/shuffleByWinrate";
import { pauseLobbyWatcher } from "../../api/lobbyWatcher/pauseLobbyWatcher";
import { resumeLobbyWatcher } from "../../api/lobbyWatcher/resumeLobbyWatcher";
import {
  shuffleWinrateButtonDefault,
  shuffleWinrateButtonError,
  shuffleWinrateButtonLoading,
  shuffleWinrateButtonSuccess,
} from "../../components/buttons/shuffleWinrate";
import { buttonId } from "../../utils/globals";
import { buildLobbyButtonRow } from "../../utils/lobbyButtons";
import { buildWinrateShufflePlan } from "../../utils/winrateShuffle";

const shuffleReasonLabels: Record<string, string> = {
  no_game: "Game not found",
  ranking_disabled: "Ranking disabled",
  not_enough_players: "Not enough players",
  already_balanced: "Already balanced",
  no_playable_teams: "No teams to balance",
};

const getBotIdFromInteraction = (interaction: ButtonInteraction) => {
  const suffix = interaction.customId.slice(buttonId.shuffleWinrate.length + 1);
  const botid = parseInt(suffix, 10);

  return Number.isNaN(botid) ? null : botid;
};

module.exports = {
  id: buttonId.shuffleWinrate,
  async execute(interaction: ButtonInteraction) {
    const message = interaction.message as Message;
    const botid = getBotIdFromInteraction(interaction);

    if (botid === null) return;

    const resumeWatcherKey = await pauseLobbyWatcher(
      interaction.guildId,
      10000
    );

    await interaction.update({
      components: [
        buildLobbyButtonRow({
          message,
          botid,
          shuffle: shuffleWinrateButtonLoading({ botid }),
          slotsTaken: 1,
        }),
      ],
    });

    const plan = await buildWinrateShufflePlan(interaction.guildId, botid);

    if (plan.ok === false) {
      await message.edit({
        components: [
          buildLobbyButtonRow({
            message,
            botid,
            shuffle: shuffleWinrateButtonError({
              botid,
              label: shuffleReasonLabels[plan.reason] || "Balance failed",
            }),
            slotsTaken: 1,
          }),
        ],
      });

      setTimeout(async () => {
        await message.edit({
          components: [
            buildLobbyButtonRow({
              message,
              botid,
              shuffle: shuffleWinrateButtonDefault({ botid }),
              slotsTaken: 1,
            }),
          ],
        });
      }, 3000);

      clearTimeout(resumeWatcherKey);
      resumeLobbyWatcher(interaction.guildId);
      return;
    }

    const result = await shuffleByWinrate(plan.swaps);

    await message.edit({
      components: [
        buildLobbyButtonRow({
          message,
          botid,
          shuffle:
            result === "success"
              ? shuffleWinrateButtonSuccess({ botid })
              : shuffleWinrateButtonError({ botid }),
          slotsTaken: 1,
        }),
      ],
    });

    setTimeout(async () => {
      await message.edit({
        components: [
          buildLobbyButtonRow({
            message,
            botid,
            shuffle: shuffleWinrateButtonDefault({ botid }),
            slotsTaken: 1,
          }),
        ],
      });
    }, 3000);

    clearTimeout(resumeWatcherKey);
    resumeLobbyWatcher(interaction.guildId);
  },
};
