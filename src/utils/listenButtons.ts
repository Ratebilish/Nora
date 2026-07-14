import { client } from "../bot";
import { guildID } from "./globals";
import { log } from "./log";
import { logButtonCommand } from "./logCmd";

export const listenButtons = () =>
  client.on("interactionCreate", async (interaction) => {
    if (interaction.guildId !== guildID) return;

    if (!interaction.isButton()) return;

    let command = client.buttons.get(interaction.customId);

    if (!command) {
      for (const [id, buttonCommand] of client.buttons) {
        if (interaction.customId.startsWith(`${id}:`)) {
          command = buttonCommand;
          break;
        }
      }
    }

    if (!command) return;

    logButtonCommand(interaction);

    try {
      await command.execute(interaction);
    } catch (error) {
      log(error);
    }
  });
