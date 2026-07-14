import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Message,
} from "discord.js";
import { pubGame } from "../../api/ghost/pubGame";
import { pauseLobbyWatcher } from "../../api/lobbyWatcher/pauseLobbyWatcher";
import { resetCommandHubState } from "../../api/lobbyWatcher/resetCommandHubState";
import { resumeLobbyWatcher } from "../../api/lobbyWatcher/resumeLobbyWatcher";
import { getLobbyWatcherSettings } from "../../api/lobbyWatcher/settingsApi";
import {
  hostGameButtonError,
  hostGameButtonLoading,
  hostGameButtonSuccess,
} from "../../components/buttons/hostGame";
import { refreshWatcherButtonDefault } from "../../components/buttons/refreshWatcher";
import { showConfigSelectorButtonDefault } from "../../components/buttons/showConfigSelector";
import { createLobbyGame } from "../../db/queries";
import { botEvents } from "../../utils/events";
import {
  botStatusVariables,
  buttonId,
  ghostGuildBotId,
  production,
} from "../../utils/globals";
import { getCurrentLobbies } from "../../utils/lobbyParser";
import { log } from "../../utils/log";

function generateShortId(length = 4): string {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

module.exports = {
  id: buttonId.hostGame,
  async execute(interaction: ButtonInteraction) {
    await interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          hostGameButtonLoading(),
          showConfigSelectorButtonDefault({ disabled: true }),
          refreshWatcherButtonDefault()
        ),
      ],
    });

    const games = await getCurrentLobbies(interaction.guildId);

    if (games && games.some((game) => game.botid === ghostGuildBotId)) {
      log("[host game button] lobby exist");
      await (interaction.message as Message).edit({
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            hostGameButtonError({ label: "Lobby already exist" }),
            showConfigSelectorButtonDefault({ disabled: true }),
            refreshWatcherButtonDefault()
          ),
        ],
      });
      resetCommandHubState(interaction.message);
      return;
    }

    const resumeLobbyKey = await pauseLobbyWatcher(interaction.guildId, 10000);

    const result = await pubGame(`re-${generateShortId()}`);

    switch (result) {
      case "success":
        const settings = await getLobbyWatcherSettings(interaction.guildId);

        await createLobbyGame(
          ghostGuildBotId,
          settings && settings.lastLoadedMap
        );

        log("[host game button] temp lobby created");

        botStatusVariables.lobbyCount = botStatusVariables.lobbyCount + 1;
        botEvents.emit(botEvent.update);

        log("[host game button] send success");
        await (interaction.message as Message).edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              hostGameButtonSuccess(),
              showConfigSelectorButtonDefault({ disabled: true }),
              refreshWatcherButtonDefault()
            ),
          ],
        });
        break;
      case "timeout":
      case "error":
      case "uknown":
        log("[host game button] send error/uknown");
        await (interaction.message as Message).edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              hostGameButtonError({ label: "No config loaded" }),
              showConfigSelectorButtonDefault({ disabled: true }),
              refreshWatcherButtonDefault()
            ),
          ],
        });
        break;
      case null:
        log("[host game button] send null");
        await (interaction.message as Message).edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              hostGameButtonError(),
              showConfigSelectorButtonDefault({ disabled: true }),
              refreshWatcherButtonDefault()
            ),
          ],
        });
        break;
    }

    await resetCommandHubState(interaction.message);
    await resumeLobbyWatcher(interaction.guildId);
    clearTimeout(resumeLobbyKey);
  },
};
