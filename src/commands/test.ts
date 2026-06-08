import { ChatInputCommandInteraction } from "discord.js";
import testCommand from "../commandData/test";
import { ownerID } from "../utils/globals";

module.exports = {
  data: testCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== ownerID)
      return interaction.reply({
        ephemeral: true,
        content: "You cant use this command",
      });

    await interaction.deferReply();

    await interaction.editReply({
      content: "kek",
    });
    return;
  },
};
