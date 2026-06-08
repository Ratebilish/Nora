import { SlashCommandBuilder } from "discord.js";

// discord.js v14: addChoice → addChoices с объектами { name, value }

export const lobbyCommand = new SlashCommandBuilder()
  .setName("lobby")
  .setDescription(
    "Checking for lobbies in real time (only one instance per server)"
  )
  .addSubcommand((command) =>
    command
      .setName("start")
      .setDescription("start lobby watcher")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("channel to send messages")
          .setRequired(false)
      )
      .addIntegerOption((option) =>
        option
          .setName("delay")
          .setDescription("updatind interval")
          .setRequired(false)
          .addChoices(
            { name: "1 second", value: 1000 },
            { name: "2 seconds", value: 2000 },
            { name: "3 seconds", value: 3000 },
            { name: "4 seconds", value: 4000 },
            { name: "5 seconds", value: 5000 }
          )
      )
      .addBooleanOption((option) =>
        option
          .setName("check")
          .setDescription("check all bots in database")
          .setRequired(false)
      )
  )
  .addSubcommand((command) =>
    command.setName("stop").setDescription("stop lobby watcher")
  );

export default lobbyCommand;
module.exports = lobbyCommand;
