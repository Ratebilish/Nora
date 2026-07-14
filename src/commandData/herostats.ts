import { SlashCommandBuilder } from "discord.js";

export const herostatsCommand = new SlashCommandBuilder()
  .setName("herostats")
  .setDescription("Hero statistics")
  .addSubcommand((command) =>
    command
      .setName("summary")
      .setDescription("Show hero statistics summary")
      .addStringOption((option) =>
        option
          .setName("nickname")
          .setDescription(
            "Nickname to check, leave empty to check your binded nickname"
          )
          .setRequired(false)
      )
  )
  .addSubcommand((command) =>
    command
      .setName("leaderboard")
      .setDescription("Show leaderboard by hero usage")
  )
  .addSubcommand((command) =>
    command
      .setName("winrate")
      .setDescription("Show hero winrate statistics")
      .addStringOption((option) =>
        option
          .setName("nickname")
          .setDescription(
            "Nickname to check, leave empty to check your binded nickname"
          )
          .setRequired(false)
      )
  );

export default herostatsCommand;
module.exports = herostatsCommand;
