import { ChatInputCommandInteraction } from "discord.js";
import { error, success } from "../../../embeds/response";
import { editReply } from "../../../utils/discordMessage";
import { ghostCmd } from "../../../utils/globals";
import { updateMapConfigOptions } from "../../../utils/mapConfig";

export const setranking = async (interaction: ChatInputCommandInteraction) => {
  const name = interaction.options.getString("name");
  const enabled = interaction.options.getBoolean("enabled");

  const updated = await updateMapConfigOptions(
    interaction.guildId,
    name,
    { fieldName: "ranking", value: enabled }
  );

  if (!updated) {
    await editReply(
      interaction,
      { embeds: [error(`Can't find config "${name}"`) as any] },
      ghostCmd.deleteMessageTimeout
    );
    return;
  }

  await editReply(
    interaction,
    {
      embeds: [
        success(`Ranking for "${name}" set to \`${enabled}\``) as any,
      ],
    },
    ghostCmd.deleteMessageTimeout
  );
};
