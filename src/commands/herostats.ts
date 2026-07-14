import { ChatInputCommandInteraction } from "discord.js";
import { leaderboard } from "../api/commands/herostats/leaderboard";
import { summary } from "../api/commands/herostats/summary";
import { winrate } from "../api/commands/herostats/winrate";
import herostatsCommand from "../commandData/herostats";
import { ownerID, production } from "../utils/globals";

module.exports = {
  data: herostatsCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!production && interaction.member.user.id !== ownerID) return;

    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
      case "summary":
        await summary(interaction);
        return;
      case "leaderboard":
        await leaderboard(interaction);
        return;
      case "winrate":
        await winrate(interaction);
        return;
      default:
        return await interaction.editReply("...");
    }
  },
};
