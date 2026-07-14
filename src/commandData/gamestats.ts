import { SlashCommandBuilder } from "discord.js";

export const gamestatsCommand = new SlashCommandBuilder()
  .setName("gamestats")
  .setDescription("Stats collecting after game")
  .addSubcommand((command) =>
    command
      .setName("start")
      .setDescription("start collecting stats")
      .addChannelOption((option) =>
        option.setName("channel").setDescription("channel to send messages")
      )
  )
  .addSubcommand((command) =>
    command.setName("stop").setDescription("stop collecting stats")
  )
  .addSubcommand((command) =>
    command
      .setName("test")
      .setDescription(
        "Force-send the summary for the latest recorded game (for testing, does not affect MMR)"
      )
  );

export default gamestatsCommand;
module.exports = gamestatsCommand;
