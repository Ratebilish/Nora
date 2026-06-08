import { AttachmentBuilder, ChatInputCommandInteraction } from "discord.js";
import { generateReportFileData } from "../api/commands/report/generateReportFileData";
import reportCommand from "../commandData/report";
import { sendReply } from "../utils/discordMessage";

// discord.js v14: MessageAttachment → AttachmentBuilder

module.exports = {
  data: reportCommand,
  ownerOnly: true,
  async execute(interaction: ChatInputCommandInteraction) {
    const { file, fileName } = await generateReportFileData();

    await interaction.user.send({
      files: [new AttachmentBuilder(file, { name: fileName })],
    });

    await sendReply(interaction, { content: "complete", ephemeral: true });
  },
};
