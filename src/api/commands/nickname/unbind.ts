import { ChatInputCommandInteraction } from "discord.js";
import { success } from "../../../embeds/response";
import { editReply } from "../../../utils/discordMessage";
import { msgDeleteTimeout } from "../../../utils/globals";
import { unbindNickname } from "../../nickname/unbindNickname";

export const unbind = async (interaction: ChatInputCommandInteraction) => {
  await unbindNickname(interaction.user.id, interaction.guildId);
  await editReply(
    interaction,
    { embeds: [success(`Nick unbinded`) as any] },
    msgDeleteTimeout.default
  );
};
