import md5 from "md5";
import { lobbyGame } from "../../embeds/lobby";
import { groupsKey, redisKey } from "../../redis/kies";
import { redis } from "../../redis/redis";
import {
  deleteMessageWithDelay,
  editMessage,
  getMessageById,
  sendResponse,
} from "../../utils/discordMessage";
import { buildLobbyButtonRow } from "../../utils/lobbyButtons";
import { getCurrentLobby, playersLobbyToString } from "../../utils/lobbyParser";
import { log } from "../../utils/log";
import { searchMapConfigByMapName } from "../../utils/mapConfig";
import { buildWinrateShufflePlan } from "../../utils/winrateShuffle";

// discord.js v14: MessageActionRow → ActionRowBuilder
// resolveComponent удалён — используем helper

export const lobbyMsgUpdater = async (
  guildID: string,
  botid: number,
  delay: number
) => {
  try {
    await updateLobbyMessage(guildID, botid, delay);
  } catch (error) {
    log("[lobby msg updater] unhandled error", error);
    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
  }
};

const updateLobbyMessage = async (
  guildID: string,
  botid: number,
  delay: number
) => {
  const settingsKey = redisKey.struct(groupsKey.lobbyWatcher, [guildID]);
  const settings = (await redis.get(settingsKey)) as lobbyWatcherInfo;

  if (settings === undefined) {
    log("[lobby msg updater] redis error");
    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
    return;
  }

  if (settings === null) {
    log("[lobby msg updater] deleted");
    return;
  }

  if (settings.paused) {
    log("[lobby msg updater] stopped");
    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
    return;
  }

  const lobbySettingsKey = redisKey.struct(groupsKey.lobbyGameWatcher, [
    guildID,
    settings.channelID,
    botid.toString(),
  ]);

  const lobbySettings = (await redis.get(
    lobbySettingsKey
  )) as lobbyGameWatcherInfo;

  if (lobbySettings === undefined) {
    log("[lobby msg updater] redis error");
    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
    return;
  }

  if (lobbySettings === null) {
    log("[lobby msg updater] deleted");
    return;
  }

  const msg = await getMessageById(lobbySettings.msgId, settings.channelID);

  const game = await getCurrentLobby(guildID, botid);

  if (game === undefined) {
    log("[lobby msg updater] error getting game");
    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
    return;
  }

  if (game === null) {
    log("[lobby msg updater] game does not exist, deleting msg");
    const result = await redis.del(lobbySettingsKey);

    if (result === undefined) {
      log("[lobby msg updater] cant delete redis data");
      setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
      return;
    }

    deleteMessageWithDelay(msg, 0);
    return;
  }

  const { parsedGame, newLobbyHash, prevLobbyHash, rankingEnabled, balanced } =
    await getGameParams(guildID, game, lobbySettings);

  const msgEmbeds = [lobbyGame(parsedGame) as any];

  if (!msg) {
    log("[lobby msg updater] cant get prev msg, creating new one");

    const msgComponents = [
      buildLobbyButtonRow({
        botid: game.botid,
        rankingEnabled,
        balanced,
        slotsTaken: game.slotsTaken,
      }),
    ];

    const newMsg = await sendResponse(settings.channelID, {
      embeds: msgEmbeds,
      components: msgComponents,
    });

    if (!newMsg) {
      log("[lobby msg updater] cant send msg");
      setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
      return;
    }

    await redis.set(lobbySettingsKey, {
      ...lobbySettings,
      msgId: newMsg.id,
      lobbyHash: newLobbyHash,
    } as lobbyGameWatcherInfo);

    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
    return;
  }

  const infoChanged = prevLobbyHash !== newLobbyHash;

  if (!infoChanged) {
    setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
    return;
  }

  log("[lobby msg updater] updating msg");

  await redis.set(lobbySettingsKey, {
    ...lobbySettings,
    lobbyHash: newLobbyHash,
  } as lobbyGameWatcherInfo);

  await editMessage(msg, {
    embeds: msgEmbeds,
    components: [
      buildLobbyButtonRow({
        message: msg,
        botid: game.botid,
        rankingEnabled,
        balanced,
        slotsTaken: game.slotsTaken,
      }),
    ],
  });

  setTimeout(() => lobbyMsgUpdater(guildID, botid, delay), delay);
  return;
};

const getGameParams = async (
  guildID: string,
  game: lobbyInfo<lobbyTable[]>,
  lobbySettings: lobbyGameWatcherInfo
) => {
  const config = await searchMapConfigByMapName(game.mapname, guildID);

  const optionField =
    config && config.options.ranking
      ? optionLobbyField.mmr
      : optionLobbyField.server;

  const parsedPlayers = playersLobbyToString(game.players, optionField);

  const parsedGame = {
    ...game,
    players: parsedPlayers,
  } as lobbyInfo<lobbyStrings>;

  const prevLobbyHash = lobbySettings.lobbyHash;
  const newLobbyHash = md5(
    parsedPlayers.nicks + JSON.stringify(parsedPlayers.option) + game.mapname
  );

  // Не балансировано = кнопка старта заблокирована. Переиспользуем ту же
  // логику, что и у кнопки шафла: если план говорит "нечего балансировать"
  // (соло-игра, недостаточно игроков, ranking выключен и т.п.) — это
  // считается балансом (кнопка старта доступна).
  const shufflePlan = await buildWinrateShufflePlan(guildID, game.botid);
  const balanced = !shufflePlan.ok;

  return {
    prevLobbyHash,
    newLobbyHash,
    parsedGame,
    rankingEnabled: Boolean(config && config.options.ranking),
    balanced,
  };
};
