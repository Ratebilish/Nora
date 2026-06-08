import { ChannelType, Snowflake, TextChannel } from "discord.js";
import { client } from "../bot";
import { log } from "./log";

// discord.js v14: channel.isText() → channel.type === ChannelType.GuildText

export const getTextChannel = async (
  id: Snowflake
): Promise<TextChannel | null> => {
  try {
    const channel = await client.channels.fetch(id, { force: true });
    if (channel.type !== ChannelType.GuildText) return null;
    return channel as TextChannel;
  } catch (error) {
    log(error);

    return null;
  }
};
