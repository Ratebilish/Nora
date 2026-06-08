import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getCommandLogs } from "../api/logs/getCommandLogs";
import logsCommand from "../commandData/logs";
import { warning } from "../embeds/response";
import { editReply } from "../utils/discordMessage";
import { msgDeleteTimeout } from "../utils/globals";

// discord.js v14: Embed из @discordjs/builders → EmbedBuilder из discord.js
// "ADMINISTRATOR" → PermissionFlagsBits.Administrator

module.exports = {
  data: logsCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({
        embeds: [warning("This command only for admins") as any],
        ephemeral: true,
      });

    await interaction.deferReply();

    const logs = await getCommandLogs(
      interaction.guildId,
      interaction.options.getString("query")
    );

    await editReply(
      interaction,
      {
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `Commands log${
                interaction.options.getString("query")
                  ? ` | ${interaction.options.getString("query")}`
                  : ""
              }`
            )
            .setDescription(
              logs.length !== 0 ? logs.join("\n") : "no logs found..."
            ),
        ],
      },
      msgDeleteTimeout.long
    );
  },
};
