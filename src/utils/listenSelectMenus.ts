import { client } from "../bot";
import { guildIDs, production } from "./globals";
import { log } from "./log";

// discord.js v14: isSelectMenu() → isStringSelectMenu()

export const listenSelectMenus = () =>
  client.on("interactionCreate", async (interaction) => {
    if (production && interaction.guildId !== guildIDs.ghostGuild) return;
    if (!production && interaction.guildId !== guildIDs.debugGuild) return;

    if (!interaction.isStringSelectMenu()) return;

    const command = client.selectMenus.get(interaction.customId);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      log(error);
    }
  });
