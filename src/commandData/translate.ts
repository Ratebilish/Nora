import { SlashCommandBuilder } from "discord.js";

// discord.js v14: addChoices принимает объекты { name, value } вместо массивов

export const translateCommand = new SlashCommandBuilder()
  .setName("translate")
  .setDescription("Translate file")
  .addStringOption((option) =>
    option
      .setName("target")
      .setDescription("Result language")
      .setRequired(true)
      .addChoices(
        { name: "English", value: "en" },
        { name: "Russian", value: "ru" },
        { name: "German", value: "de" },
        { name: "French", value: "fr" },
        { name: "Japanese", value: "ja" },
        { name: "Korean", value: "ko" },
        { name: "Spanish", value: "es" },
        { name: "Chinese", value: "zh-CN" }
      )
  )
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("Link to the discord message with attached .txt file")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("one_drive")
      .setDescription("Link to the google one drive file")
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName("code_file")
      .setDescription("use code sensitive reg exp")
      .setRequired(false)
  );

export default translateCommand;
module.exports = translateCommand;
