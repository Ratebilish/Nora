import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Collection,
  GatewayIntentBits,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { reloadBot } from "./api/reload/reload";
import { token } from "./auth.json";
import { ensurePlayerMmrTable } from "./db/queries";
import { changeBotStatus, updateStatusInfo } from "./utils/botStatus";
import { clearRedisOnStart } from "./utils/clearRedisOnStart";
import { guildID, production } from "./utils/globals";
import { ensureDefaultMapConfig } from "./utils/mapConfig";
import { listenButtons } from "./utils/listenButtons";
import { listenCommands } from "./utils/listenCommands";
import { listenSelectMenus } from "./utils/listenSelectMenus";
import { loadCommands } from "./utils/loadCommands";
import { log } from "./utils/log";
import { restartGamestats, restartLobbyWatcher } from "./utils/restartTimers";
import { sleep } from "./utils/sleep";
import {
  gamesStatusUpdater,
  ghostStatusUpdater,
  lobbyStatusUpdater,
} from "./utils/timerFuncs";

// discord.js v14: SlashCommandBuilder теперь из discord.js напрямую
export type CustomSlashCommand = {
  ownerOnly?: boolean;
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export type CustomButtonCommand = {
  id: string;
  execute: (interaction: ButtonInteraction) => Promise<void>;
};

export type CustomSelectMenuCommand = {
  id: string;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void>;
};

// discord.js v14: Intents.FLAGS заменены на GatewayIntentBits enum
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
}) as Client & {
  commands: Collection<string, CustomSlashCommand>;
  buttons: Collection<string, CustomButtonCommand>;
  selectMenus: Collection<string, CustomSelectMenuCommand>;
};

loadCommands();

client.once("ready", async () => {
  log("------> SETTING UP");

  await clearRedisOnStart();

  const lwCount = await restartLobbyWatcher();

  await changeBotStatus("☀ Just woke up");

  await sleep(2000);
  const gsCount = await restartGamestats();

  setTimeout(() => ghostStatusUpdater(), 5000);
  setTimeout(() => lobbyStatusUpdater(), 10000);
  setTimeout(() => gamesStatusUpdater(1000 * 10), 15000);
  setTimeout(async () => {
    await changeBotStatus("🔄 Planned reboot 🔄");
    await reloadBot(false);
  }, 1000 * 60 * 60 * 24);
  await updateStatusInfo();

  const mapConfigResult = await ensureDefaultMapConfig(guildID);
  log(`[map config] ensure fbt: ${mapConfigResult}`);

  const mmrTableResult = await ensurePlayerMmrTable();
  log(`[mmr] ensure player_mmr table: ${mmrTableResult}`);

  log("------> BOT IN DEVELOPMENT OR LOGS ENABLED");
});

listenCommands();
listenButtons();
listenSelectMenus();

process.on("unhandledRejection", (error) => {
  log("[bot]", error);
});

client.login(token);
