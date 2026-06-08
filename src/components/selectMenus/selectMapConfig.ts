import { StringSelectMenuBuilder } from "discord.js";
import { selectMenuId } from "../../utils/globals";

// discord.js v14: MessageSelectMenu → StringSelectMenuBuilder

export const selectMapConfig = (options: string[], defaultOption?: string) => {
  return new StringSelectMenuBuilder()
    .setCustomId(selectMenuId.selectMapConfig)
    .setPlaceholder("Select map config")
    .addOptions(
      options.map((option) => ({
        label: option,
        value: option,
        default: option === defaultOption,
      }))
    );
};
