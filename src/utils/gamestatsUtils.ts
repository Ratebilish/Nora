import { getGamesDataByIds } from "../db/queries";
import { gameStatsResults } from "../embeds/gameStats";
import { sendResponse } from "./discordMessage";
import { botEvents } from "./events";
import { botStatusVariables } from "./globals";
import { searchMapConfigByMapName } from "./mapConfig";
import { updateMmrForGame } from "./mmr";

const applyMmrChanges = (
  game: gameDataByIdsGamestats,
  mmrChanges: Record<string, mmrChangeEntry> | null
) => {
  if (!mmrChanges) return;
  game.players.forEach((team) => {
    team.teamPlayers.forEach((player) => {
      const change = mmrChanges[player.name];
      if (!change) return;
      player.mmrBefore = change.before;
      player.mmrAfter = change.after;
      player.mmrDelta = change.delta;
    });
  });
};

export const collectGamesData = async (
  gamesID: Array<number>,
  channelID: string,
  guildID: string
) => {
  const gamesData = await getGamesDataByIds(gamesID, guildID);
  await Promise.all(
    gamesData.map(async (game) => {
      if (game.players.length < 2) return;
      const config = await searchMapConfigByMapName(game.map, guildID);
      if (!config || config.options.ranking === false) return;

      const mmrChanges = await updateMmrForGame(game, config.name, guildID);
      applyMmrChanges(game, mmrChanges);

      sendGameResult(game, channelID, config.options.mapImage);
    })
  );
};

/**
 * Ручная принудительная отправка сводки по конкретной (обычно последней
 * сыгранной) игре — для теста формата вывода без ожидания нового матча.
 *
 * MMR считается и показывается в сводке (persist=false), но НЕ
 * записывается в БД — иначе повторный запуск теста на уже обработанной
 * ранее игре задвоил бы изменение рейтинга.
 */
export const sendTestGameResult = async (
  gameID: number,
  channelID: string,
  guildID: string
): Promise<"sent" | "no_game" | "not_two_teams"> => {
  const gamesData = await getGamesDataByIds([gameID], guildID);
  const game = gamesData && gamesData[0];

  if (!game) return "no_game";
  if (game.players.length < 2) return "not_two_teams";

  const config = await searchMapConfigByMapName(game.map, guildID);

  if (config && config.options.ranking) {
    const mmrChanges = await updateMmrForGame(
      game,
      config.name,
      guildID,
      false
    );
    applyMmrChanges(game, mmrChanges);
  }

  await sendResponse(channelID, {
    embeds: [gameStatsResults(game, config?.options.mapImage) as any],
  });

  return "sent";
};

const sendGameResult = async (
  gameData: gameDataByIdsGamestats,
  channelID: string,
  mapImage?: string
) => {
  if (botStatusVariables.gameCount > 0) {
    botStatusVariables.gameCount -= 1;
    botEvents.emit(botEvent.update);
  }
  await sendResponse(channelID, {
    embeds: [gameStatsResults(gameData, mapImage) as any],
  });
};
