import {
  bold,
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteractionOption,
  inlineCode,
  time,
} from "discord.js";
import { groupsKey, redisKey } from "../redis/kies";
import { redis } from "../redis/redis";
import { commandLogsMaxCount } from "./globals";
import { log } from "./log";

// discord.js v14: bold, inlineCode, time теперь экспортируются из discord.js
// CommandInteraction → ChatInputCommandInteraction

const getOptionsNames = (
  options: readonly CommandInteractionOption[]
): string[] => {
  return options.reduce((prev: string[], option) => {
    if (option.options) {
      return [...prev, option.name, ...getOptionsNames(option.options)];
    }

    return [...prev, option.name];
  }, [] as string[]);
};

export const logCommand = async (
  interaction: ChatInputCommandInteraction
) => {
  try {
    if (interaction.commandName === "logs") return;

    const key = redisKey.struct(groupsKey.commandLog, [interaction.guildId]);

    const logs = (await redis.get(key)) || [];

    if (logs.length > commandLogsMaxCount) {
      logs.shift();
    }

    const logEntry = `${time(new Date())} ${bold(
      interaction.user.tag
    )}\n${inlineCode(
      [
        interaction.commandName,
        ...getOptionsNames(interaction.options.data),
      ].join(" -> ")
    )}`;

    await redis.set(key, [...logs, logEntry]);
  } catch (err) {
    log("[logCmd] error when logging", err);
  }
};

export const logButtonCommand = async (interaction: ButtonInteraction) => {
  try {
    const key = redisKey.struct(groupsKey.commandLog, [interaction.guildId]);

    const logs = (await redis.get(key)) || [];

    if (logs.length > commandLogsMaxCount) {
      logs.shift();
    }

    const logEntry = `${time(new Date())} ${bold(
      interaction.user.tag
    )}\n${inlineCode(`button ${interaction.customId}`)}`;

    await redis.set(key, [...logs, logEntry]);
  } catch (err) {
    log("[logCmd] error when logging", err);
  }
};
