import { Collection } from "discord.js";

export const production: boolean = process.env.NODE_ENV === "production";
export const withLogs: boolean = process.env.LOGS === "true";

export const palette = {
  green: 0x23911e,
  red: 0xbb1616,
  blue: 0x245abb,
  yellow: 0xc5c510,
  black: 0x000001,
};

export const ghostCmd = {
  pendingTimeout: 3000,
  requestInterval: 500,
  deleteMessageTimeout: 4000,
};

export const msgDeleteTimeout = {
  short: 4000,
  default: 6000,
  long: 10000,
  info: 120000,
};

export const msgEditTimeout = {
  short: 2000,
};

export const ghostApiTimeout = 5000;

export const guildID = "408947483763277825";

export const defaultMapConfigName = "fbt";

export const defaultFbtMapConfig = (guildID: string): mapConfig => ({
  guildID,
  name: defaultMapConfigName,
  slots: 8,
  slotMap: [
    { name: "Team 1", slots: 4 },
    { name: "Team 2", slots: 4 },
  ],
  options: {
    ranking: true,
    spectatorLivesMatter: false,
    mapImage: undefined,
  },
});

export const ownerID = "183211338338664448";

export const stats = {
  gamesToBeRanked: 1,
};

export const botStatusVariables = {
  lobbyCount: 0,
  gameCount: 0,
  ghost: false,
};

export const numberToEmoji = (number: number) => {
  switch (number) {
    case 0:
      return "0️⃣";
    case 1:
      return "1️⃣";
    case 2:
      return "2️⃣";
    case 3:
      return "3️⃣";
    case 4:
      return "4️⃣";
    case 5:
      return "5️⃣";
    case 6:
      return "6️⃣";
    case 7:
      return "7️⃣";
    case 8:
      return "8️⃣";
    case 9:
      return "9️⃣";
    case 10:
      return "🔟";
    default:
      return `${number}`;
  }
};

export const defaultUserData = { ping_on_start: false } as userDataSettings;

export const winEmoji = "📈";
export const loseEmoji = "📉";

export const optionLobbyFieldToTitle = {
  [optionLobbyField.server]: "server",
  [optionLobbyField.mmr]: "MMR",
};

export const commandLogsMaxCount = 50;

export const buttonId = {
  hostGame: "lobby-watcher_button_host-game",
  unhostGame: "lobby-watcher_button_unhost-game",
  showConfigSelector: "lobby-watcher_button_show-config-selector",
  startGame: "lobby-watcher_button_start-game",
  refreshWatcher: "lobby-watcher_button_refresh-watcher",
  shuffleWinrate: "lobby-watcher_button_shuffle-winrate",
};

export const selectMenuId = {
  selectMapConfig: "ghost_select_load-map-config",
  selectMapConfigWatcherHub: "lobby-watcher_select_load-map-config",
};

export const ghostGuildBotId = parseInt(process.env.BOT_ID) || 2;

export const ghostCommandsMarks = {
  load: {
    success: /loading MPQ file/i,
    error: /warning - unable to load MPQ file/i,
  },
  map: {
    success: /loading MPQ file/i,
    error: /warning - unable to load MPQ file/i,
  },
  pub: { success: /creating game/i, error: null },
  unhost: { success: /deleting current game/i, error: null },
  start: { success: /started loading/g, error: null },
};

export const timeOutKeys = new Collection<
  "lobby-watcher-pause",
  NodeJS.Timeout
>();
