import { ButtonInteraction, Message } from "discord.js";
import { startGame } from "../../api/ghost/startGame";
import { pauseLobbyWatcher } from "../../api/lobbyWatcher/pauseLobbyWatcher";
import { resetLobbyHubState } from "../../api/lobbyWatcher/resetLobbyHubState";
import { resumeLobbyWatcher } from "../../api/lobbyWatcher/resumeLobbyWatcher";
import {
  startGameButtonError,
  startGameButtonLoading,
  startGameButtonSuccess,
} from "../../components/buttons/startGame";
import { shuffleWinrateButtonDefault } from "../../components/buttons/shuffleWinrate";
import { unhostGameButtonDefault } from "../../components/buttons/unhostGame";
import { botEvents } from "../../utils/events";
import { botStatusVariables, buttonId } from "../../utils/globals";
import {
  buildLobbyButtonRow,
  getBotIdFromLobbyMessage,
} from "../../utils/lobbyButtons";
import { getCurrentLobbies } from "../../utils/lobbyParser";
import { pingUsersOnStart } from "../../utils/notifications";

module.exports = {
  id: buttonId.startGame,
  async execute(interaction: ButtonInteraction) {
    const message = interaction.message as Message;
    const botid = getBotIdFromLobbyMessage(message);

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
          start: startGameButtonLoading({ label: "Starting..." }),
          shuffle: shuffleWinrateButtonDefault({ botid, disabled: true }),
          unhost: unhostGameButtonDefault({ disabled: true }),
        }),
      ],
    });

    const games = await getCurrentLobbies(interaction.guildId);

    if (!games || games.length === 0) {
      await message.edit({
        components: [
          buildLobbyButtonRow({
            message,
            botid,
            start: startGameButtonError({ label: "This game not exist" }),
            shuffle: shuffleWinrateButtonDefault({ botid, disabled: true }),
            unhost: unhostGameButtonDefault({ disabled: true }),
          }),
        ],
      });
      resumeLobbyWatcher(interaction.guildId);
      clearTimeout(resumeWatcherKey);
      return;
    }

    const result = await startGame(true);

    let game = null;

    switch (result) {
      case "success":
        botStatusVariables.gameCount = botStatusVariables.gameCount + 1;
        botEvents.emit(botEvent.update);

        game = games.find(
          (game) => game.gamename == result.replace(/[\[\]]/g, "")
        );

        if (game) {
          pingUsersOnStart(game, interaction.guildId);
        }

        await message.edit({
          components: [
            buildLobbyButtonRow({
              message,
              botid,
              start: startGameButtonSuccess({ label: "Started" }),
              shuffle: shuffleWinrateButtonDefault({ botid, disabled: true }),
              unhost: unhostGameButtonDefault({ disabled: true }),
            }),
          ],
        });
        break;
      case "timeout":
      case "error":
      case "uknown":
        botStatusVariables.gameCount = botStatusVariables.gameCount + 1;
        botEvents.emit(botEvent.update);

        game = games.find(
          (game) => game.gamename == result.replace(/[\[\]]/g, "")
        );

        if (game) {
          pingUsersOnStart(game, interaction.guildId);
        }

        await message.edit({
          components: [
            buildLobbyButtonRow({
              message,
              botid,
              start: startGameButtonLoading({ label: "Waiting for data..." }),
              shuffle: shuffleWinrateButtonDefault({ botid, disabled: true }),
              unhost: unhostGameButtonDefault({ disabled: true }),
            }),
          ],
        });
        break;
      case null:
        await message.edit({
          components: [
            buildLobbyButtonRow({
              message,
              botid,
              start: startGameButtonError(),
              shuffle: shuffleWinrateButtonDefault({ botid, disabled: true }),
              unhost: unhostGameButtonDefault({ disabled: true }),
            }),
          ],
        });
        break;
    }

    clearTimeout(resumeWatcherKey);
    await resetLobbyHubState(message, 3000);
    resumeLobbyWatcher(interaction.guildId);
  },
};
