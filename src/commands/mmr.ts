import { ChatInputCommandInteraction } from "discord.js";
import { leaderboard } from "../api/commands/mmr/leaderboard";
import { profile } from "../api/commands/mmr/profile";
import mmrCommand from "../commandData/mmr";

module.exports = {
  data: mmrCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
      case "profile":
        await profile(interaction);
        return;
      case "leaderboard":
        await leaderboard(interaction);
        return;
      default:
        return await interaction.editReply("...");
    }
  },
};
