import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { start } from "../api/commands/gamestats/start";
import { stop } from "../api/commands/gamestats/stop";
import { test } from "../api/commands/gamestats/test";
import gamestatsCommand from "../commandData/gamestats";
import { warning } from "../embeds/response";
import { ownerID, production } from "../utils/globals";

// discord.js v14: "ADMINISTRATOR" → PermissionFlagsBits.Administrator

module.exports = {
  data: gamestatsCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!production && interaction.member.user.id !== ownerID) return;

    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({
        embeds: [warning("This command only for admins") as any],
        ephemeral: true,
      });

    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
      case "start":
        await start(interaction);
        return;
      case "stop":
        await stop(interaction);
        return;
      case "test":
        await test(interaction);
        return;
      default:
        return await interaction.editReply("...");
    }
  },
};
