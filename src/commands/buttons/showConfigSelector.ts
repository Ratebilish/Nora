import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  Message,
  StringSelectMenuBuilder,
} from "discord.js";
import { pauseLobbyWatcher } from "../../api/lobbyWatcher/pauseLobbyWatcher";
import { resetCommandHubState } from "../../api/lobbyWatcher/resetCommandHubState";
import { resumeLobbyWatcher } from "../../api/lobbyWatcher/resumeLobbyWatcher";
import { hostGameButtonDefault } from "../../components/buttons/hostGame";
import { refreshWatcherButtonDefault } from "../../components/buttons/refreshWatcher";
import {
  showConfigSelectorButtonError,
  showConfigSelectorButtonLoading,
} from "../../components/buttons/showConfigSelector";
import { mapConfigSelectorDefault } from "../../components/selectMenus/mapConfigSelector";
import { buttonId, ghostGuildBotId } from "../../utils/globals";
import { getCurrentLobbies } from "../../utils/lobbyParser";
import { getConfigListFromGhost } from "../../utils/requestToGuiServer";
import { resolveButton } from "../../utils/resolveComponent";

module.exports = {
  id: buttonId.showConfigSelector,
  async execute(interaction: ButtonInteraction) {
    const message = interaction.message as Message;

    // discord.js v14: resolveComponent удалён — используем helper
    const hostButtonPrev = resolveButton(message, buttonId.hostGame);

    const currentHostButton = hostButtonPrev
      ? hostButtonPrev.setDisabled(true)
      : hostGameButtonDefault({ disabled: true });

    await interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          currentHostButton,
          showConfigSelectorButtonLoading(),
          refreshWatcherButtonDefault()
        ),
      ],
    });

    const resumeLobbyKey = await pauseLobbyWatcher(interaction.guildId, 15000);

    const games = await getCurrentLobbies(interaction.guildId);

    if (games && games.some((game) => game.botid === ghostGuildBotId)) {
      await message.edit({
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            currentHostButton,
            showConfigSelectorButtonError({
              label: "Cant load config when lobby exist",
              disabled: true,
            }),
            refreshWatcherButtonDefault()
          ),
        ],
      });
      await resetCommandHubState(interaction.message);
      clearTimeout(resumeLobbyKey);
      await resumeLobbyWatcher(interaction.guildId);
      return;
    }

    const configs = await getConfigListFromGhost();

    if (!configs) {
      message.edit({
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            currentHostButton,
            showConfigSelectorButtonError({
              label: "Network error",
              disabled: true,
            }),
            refreshWatcherButtonDefault()
          ),
        ],
      });
      await resetCommandHubState(interaction.message);
      clearTimeout(resumeLobbyKey);
      await resumeLobbyWatcher(interaction.guildId);
      return;
    }

    if (configs.length === 0) {
      message.edit({
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            currentHostButton,
            showConfigSelectorButtonError({
              label: "No configs found",
              disabled: true,
            }),
            refreshWatcherButtonDefault()
          ),
        ],
      });
      await resetCommandHubState(interaction.message);
      clearTimeout(resumeLobbyKey);
      await resumeLobbyWatcher(interaction.guildId);
      return;
    }

    message.edit({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          currentHostButton,
          showConfigSelectorButtonLoading({
            disabled: true,
            label: "Selecting map...",
          }),
          refreshWatcherButtonDefault()
        ),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          mapConfigSelectorDefault({ options: configs })
        ),
      ],
    });
    return;
  },
};
