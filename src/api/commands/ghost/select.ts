import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
} from "discord.js";
import { selectMapConfig } from "../../../components/selectMenus/selectMapConfig";
import { error, info } from "../../../embeds/response";
import { editReply } from "../../../utils/discordMessage";
import { msgDeleteTimeout } from "../../../utils/globals";
import { getConfigListFromGhost } from "../../../utils/requestToGuiServer";

// discord.js v14: CommandInteraction → ChatInputCommandInteraction
// MessageActionRow → ActionRowBuilder

export const select = async (interaction: ChatInputCommandInteraction) => {
  const configs = await getConfigListFromGhost();

  if (!configs)
    return await editReply(
      interaction,
      {
        embeds: [error("Network error") as any],
      },
      msgDeleteTimeout.short
    );

  if (configs.length === 0)
    return await editReply(
      interaction,
      {
        embeds: [info("There are no configs in ghost") as any],
      },
      msgDeleteTimeout.short
    );

  await editReply(
    interaction,
    {
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMapConfig(configs)
        ),
      ],
    },
    msgDeleteTimeout.info
  );
};
