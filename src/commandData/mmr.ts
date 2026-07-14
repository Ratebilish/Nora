import { SlashCommandBuilder } from "discord.js";

export const mmrCommand = new SlashCommandBuilder()
  .setName("mmr")
  .setDescription("MMR rating")
  .addSubcommand((command) =>
    command
      .setName("profile")
      .setDescription("Show your MMR for a map config")
      .addStringOption((option) =>
        option
          .setName("nickname")
          .setDescription(
            "Nickname to check, leave empty to check your binded nickname"
          )
          .setRequired(false)
      )
      .addStringOption((option) =>
        option
          .setName("mapconfig")
          .setDescription(
            "Map config name, leave empty for the default one"
          )
          .setRequired(false)
      )
  )
  .addSubcommand((command) =>
    command
      .setName("leaderboard")
      .setDescription("Show MMR leaderboard for a map config")
      .addStringOption((option) =>
        option
          .setName("mapconfig")
          .setDescription(
            "Map config name, leave empty for the default one"
          )
          .setRequired(false)
      )
  );

export default mmrCommand;
module.exports = mmrCommand;
