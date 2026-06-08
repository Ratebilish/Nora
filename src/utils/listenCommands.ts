import { client } from "../bot";
import { warning } from "../embeds/response";
import { sendReply } from "./discordMessage";
import { guildIDs, msgDeleteTimeout, ownerID, production } from "./globals";
import { log } from "./log";
import { logCommand } from "./logCmd";

// discord.js v14: interaction.isCommand() → isChatInputCommand() для точности

export const listenCommands = () =>
  client.on("interactionCreate", async (interaction) => {
    log(`[cmd] interaction received, type=${interaction.type}, guild=${interaction.guildId}`);

    if (production && interaction.guildId !== guildIDs.ghostGuild) {
      log(`[cmd] rejected: production guild mismatch (expected ${guildIDs.ghostGuild})`);
      return;
    }
    if (!production && interaction.guildId !== guildIDs.debugGuild) {
      log(`[cmd] rejected: debug guild mismatch (expected ${guildIDs.debugGuild}, got ${interaction.guildId})`);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    log(`[cmd] command: ${interaction.commandName}`);
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      log(`[cmd] command not found in collection: ${interaction.commandName}`);
      log(`[cmd] available commands: ${[...client.commands.keys()].join(", ")}`);
      return;
    }

    if (command.ownerOnly && interaction.user.id !== ownerID) {
      sendReply(
        interaction,
        {
          embeds: [warning("This command is only for owner") as any],
        },
        msgDeleteTimeout.short
      );
      return;
    }

    logCommand(interaction);

    try {
      await command.execute(interaction);
    } catch (error) {
      log(error);
      try {
        const payload = {
          content: ">_< Bakaaa!!! ",
          ephemeral: true,
        };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (err) {
        log(err);
      }
    }
  });
