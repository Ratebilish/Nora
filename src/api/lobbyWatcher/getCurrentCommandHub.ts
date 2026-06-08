import { ActionRowBuilder, ButtonBuilder } from "discord.js";
import {
  hostGameButtonDefault,
  hostGameButtonSuccess,
} from "../../components/buttons/hostGame";
import { refreshWatcherButtonDefault } from "../../components/buttons/refreshWatcher";
import { showConfigSelectorButtonDefault } from "../../components/buttons/showConfigSelector";

// discord.js v14: MessageActionRow → ActionRowBuilder

export const getCommandHubState = (isLobbyExist: boolean) => {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      isLobbyExist ? hostGameButtonSuccess() : hostGameButtonDefault(),
      showConfigSelectorButtonDefault({ disabled: isLobbyExist }),
      refreshWatcherButtonDefault()
    ),
  ];
};
