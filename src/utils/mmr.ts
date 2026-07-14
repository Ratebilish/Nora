import {
  DEFAULT_MMR,
  getPlayersMmrBulk,
  upsertPlayersMmr,
} from "../db/queries";

// Классический Elo K-фактор: насколько сильно один матч двигает рейтинг
const K_FACTOR = 32;

// Насколько сильно личная результативность (DPS/KD относительно среднего
// по своей же команде) может дополнительно двигать рейтинг сверху Elo-дельты
const PERFORMANCE_BONUS_SCALE = 6;
const MAX_PERFORMANCE_BONUS = 10;

const expectedScore = (ratingA: number, ratingB: number): number =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

const average = (nums: number[]): number =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

type TeamPlayer = {
  nickname: string;
  mmr: number;
  kills: number;
  deaths: number;
  damage: number;
};

/**
 * Бонус/штраф за индивидуальную результативность относительно среднего по
 * своей команде. У среднего игрока команды бонус около 0. Обгоняющий
 * команду по DPS и KD получает небольшой плюс, отстающий — небольшой минус.
 */
const performanceBonus = (
  playerDps: number,
  teamAvgDps: number,
  playerKd: number,
  teamAvgKd: number
): number => {
  const dpsRatio = teamAvgDps > 0 ? playerDps / teamAvgDps : 1;
  const kdRatio = teamAvgKd > 0 ? playerKd / teamAvgKd : 1;
  const performanceFactor = (dpsRatio + kdRatio) / 2 - 1;
  const bonus = Math.round(performanceFactor * PERFORMANCE_BONUS_SCALE);
  return Math.max(-MAX_PERFORMANCE_BONUS, Math.min(MAX_PERFORMANCE_BONUS, bonus));
};

/**
 * Обновляет MMR всех игроков завершённой ranked-игры и возвращает, на
 * сколько изменился рейтинг каждого (для отображения в сводке игры).
 *
 * Алгоритм (по договорённости):
 *  1) Классический Elo, применённый к среднему рейтингу каждой из двух команд
 *  2) Небольшой дополнительный бонус/штраф за DPS и K/D относительно
 *     среднего по своей же команде в этом матче
 *
 * Использует kills/deaths/damage, которые getGamesDataByIds уже подгрузила
 * в gameData — отдельного похода в БД за MMD-статистикой больше не требуется.
 *
 * Возвращает null (ничего не делает), если игра не 2-командная, нет
 * определённого победителя, или не удалось получить текущий MMR игроков —
 * такие случаи не должны ломать остальной пайплайн обработки результатов.
 */
export const updateMmrForGame = async (
  gameData: gameDataByIdsGamestats,
  mapConfigName: string,
  guildID: string,
  persist: boolean = true
): Promise<Record<string, mmrChangeEntry> | null> => {
  if (gameData.winnerTeam === null || gameData.winnerTeam === undefined)
    return null;
  if (gameData.players.length !== 2) return null;

  const [teamA, teamB] = gameData.players;
  if (!teamA.teamPlayers.length || !teamB.teamPlayers.length) return null;

  const allNicknames = [
    ...teamA.teamPlayers.map((p) => p.name),
    ...teamB.teamPlayers.map((p) => p.name),
  ].filter(Boolean);

  if (!allNicknames.length) return null;

  const currentMmr = await getPlayersMmrBulk(
    guildID,
    mapConfigName,
    allNicknames
  );

  const buildTeamPlayers = (teamPlayers: gamePlayerStats[]): TeamPlayer[] =>
    teamPlayers
      .filter((p) => p.name)
      .map((p) => ({
        nickname: p.name,
        mmr: currentMmr[p.name]?.mmr ?? DEFAULT_MMR,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        damage: p.damage ?? 0,
      }));

  const teamAPlayers = buildTeamPlayers(teamA.teamPlayers);
  const teamBPlayers = buildTeamPlayers(teamB.teamPlayers);

  if (!teamAPlayers.length || !teamBPlayers.length) return null;

  const teamAAvgMmr = average(teamAPlayers.map((p) => p.mmr));
  const teamBAvgMmr = average(teamBPlayers.map((p) => p.mmr));

  const durationSeconds = gameData.duration || 1;

  const teamAAvgDps =
    average(teamAPlayers.map((p) => p.damage / durationSeconds)) || 1;
  const teamBAvgDps =
    average(teamBPlayers.map((p) => p.damage / durationSeconds)) || 1;
  const teamAAvgKd =
    average(teamAPlayers.map((p) => p.kills / Math.max(1, p.deaths))) || 1;
  const teamBAvgKd =
    average(teamBPlayers.map((p) => p.kills / Math.max(1, p.deaths))) || 1;

  // Индексы команд в gameData.players соответствуют реальным номерам team
  // (см. getGamesDataByIds), winnerTeam — тоже номер team, поэтому просто
  // сравниваем с индексом 0 (единственные два варианта после фильтра выше)
  const teamAWon = gameData.winnerTeam === 0;

  const expectedA = expectedScore(teamAAvgMmr, teamBAvgMmr);
  const expectedB = 1 - expectedA;
  const actualA = teamAWon ? 1 : 0;
  const actualB = teamAWon ? 0 : 1;

  const teamADelta = Math.round(K_FACTOR * (actualA - expectedA));
  const teamBDelta = Math.round(K_FACTOR * (actualB - expectedB));

  const updates: Array<{
    nickname: string;
    newMmr: number;
    isWin: boolean;
  }> = [];

  const changes: Record<string, mmrChangeEntry> = {};

  const applyTeam = (
    players: TeamPlayer[],
    teamDelta: number,
    teamAvgDps: number,
    teamAvgKd: number,
    won: boolean
  ) => {
    players.forEach((p) => {
      const playerDps = p.damage / durationSeconds;
      const playerKd = p.kills / Math.max(1, p.deaths);
      const bonus = performanceBonus(playerDps, teamAvgDps, playerKd, teamAvgKd);
      const totalDelta = teamDelta + bonus;
      const newMmr = Math.max(0, p.mmr + totalDelta);

      updates.push({ nickname: p.nickname, newMmr, isWin: won });
      changes[p.nickname] = {
        before: p.mmr,
        after: newMmr,
        delta: newMmr - p.mmr,
      };
    });
  };

  applyTeam(teamAPlayers, teamADelta, teamAAvgDps, teamAAvgKd, teamAWon);
  applyTeam(teamBPlayers, teamBDelta, teamBAvgDps, teamBAvgKd, !teamAWon);

  if (persist) {
    await upsertPlayersMmr(guildID, mapConfigName, updates);
  }

  return changes;
};
