import {
  ActionRowBuilder,
  ButtonBuilder,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { loadMapFromFile } from "../../api/ghost/loadMapFromFile";
import { pauseLobbyWatcher } from "../../api/lobbyWatcher/pauseLobbyWatcher";
import { resetCommandHubState } from "../../api/lobbyWatcher/resetCommandHubState";
import { resumeLobbyWatcher } from "../../api/lobbyWatcher/resumeLobbyWatcher";
import { updateLobbyWatcherSettings } from "../../api/lobbyWatcher/settingsApi";
import { hostGameButtonDefault } from "../../components/buttons/hostGame";
import { refreshWatcherButtonDefault } from "../../components/buttons/refreshWatcher";
import {
  showConfigSelectorButtonError,
  showConfigSelectorButtonLoading,
  showConfigSelectorButtonSuccess,
} from "../../components/buttons/showConfigSelector";
import { buttonId, selectMenuId } from "../../utils/globals";
import { log } from "../../utils/log";
import { resolveButton, resolveSelectMenu } from "../../utils/resolveComponent";

// discord.js v14: SelectMenuInteraction → StringSelectMenuInteraction

module.exports = {
  id: selectMenuId.selectMapConfigWatcherHub,
  async execute(interaction: StringSelectMenuInteraction) {
    const message = interaction.message as Message;

    // discord.js v14: resolveComponent удалён — используем helpers
    const selectMenu = resolveSelectMenu(
      message,
      selectMenuId.selectMapConfigWatcherHub
    );
    const hostButton =
      resolveButton(message, buttonId.hostGame) ||
      hostGameButtonDefault({ disabled: true });
    const showConfigButton =
      resolveButton(message, buttonId.showConfigSelector) ||
      showConfigSelectorButtonLoading();

    if (!selectMenu) return;

    await interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          hostButton,
          showConfigButton,
          refreshWatcherButtonDefault()
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu
            .setDisabled(true)
            .setPlaceholder(`Loading ${interaction.values[0]}...`)
        ),
      ],
    });

    const resumeLobbyKey = await pauseLobbyWatcher(interaction.guildId, 10000);

    const result = await loadMapFromFile(interaction.values[0]);

    switch (result) {
      case "success":
      case "timeout":
        log("[select map config] success/timeout");
        updateLobbyWatcherSettings(interaction.guildId, {
          lastLoadedMap: interaction.values[0],
          forceUpdate: true,
        });

        await message.edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              hostButton,
              showConfigSelectorButtonSuccess(),
              refreshWatcherButtonDefault()
            ),
          ],
        });
        break;
      case "uknown":
      case "error":
        log("[select map config] uknown/error");
        await message.edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              hostButton,
              showConfigSelectorButtonError({ label: "Cant load this config" }),
              refreshWatcherButtonDefault()
            ),
          ],
        });
        break;
      case null:
        log("[select map config] null");
        await message.edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              hostButton,
              showConfigSelectorButtonError(),
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
