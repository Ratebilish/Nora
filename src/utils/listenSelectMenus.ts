import { client } from "../bot";
import { guildID } from "./globals";
import { log } from "./log";

// discord.js v14: isSelectMenu() → isStringSelectMenu()

export const listenSelectMenus = () =>
  client.on("interactionCreate", async (interaction) => {
    if (interaction.guildId !== guildID) return;

    if (!interaction.isStringSelectMenu()) return;

    const command = client.selectMenus.get(interaction.customId);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      log(error);
    }
  });
