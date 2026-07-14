import { palette } from "../utils/globals";
import { displayWidth } from "../utils/stringDecorations";
import { getPassedTime } from "../utils/timePassed";

const MAX_HERO_WIDTH = 14;

const truncateHero = (heroes: string[]): string => {
  const joined = heroes.length ? heroes.join(", ") : "-";
  if (displayWidth(joined) <= MAX_HERO_WIDTH) return joined;
  let result = "";
  for (const ch of joined) {
    if (displayWidth(result + ch) > MAX_HERO_WIDTH - 1) break;
    result += ch;
  }
  return `${result}…`;
};

const formatMmrDelta = (delta: number | undefined): string => {
  if (delta === undefined) return "—";
  return delta > 0 ? `+${delta}` : `${delta}`;
};

/**
 * MVP команды — игрок с наибольшим "перформансом" относительно среднего
 * по своей же команде. Та же идея, что и бонус к MMR (utils/mmr.ts):
 * сравниваем DPS и K/D игрока со средним по команде и берём того, у кого
 * сумма отношений выше.
 */
const findMvpName = (
  teamPlayers: gamePlayerStats[],
  durationSeconds: number
): string | null => {
  if (teamPlayers.length < 2) return null;

  const dpsOf = (p: gamePlayerStats) =>
    durationSeconds > 0 ? p.damage / durationSeconds : 0;
  const kdOf = (p: gamePlayerStats) => p.kills / Math.max(1, p.deaths);

  const avgDps =
    teamPlayers.reduce((sum, p) => sum + dpsOf(p), 0) / teamPlayers.length ||
    1;
  const avgKd =
    teamPlayers.reduce((sum, p) => sum + kdOf(p), 0) / teamPlayers.length ||
    1;

  let best = teamPlayers[0];
  let bestScore = -Infinity;

  teamPlayers.forEach((p) => {
    const score = dpsOf(p) / avgDps + kdOf(p) / avgKd;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  });

  return best.name;
};

/**
 * Колонки должны быть категориями (Игрок / Герой / Статы), а не карточкой
 * на человека — но ровно 5 отдельных узких полей-категорий (Игрок, Герой,
 * K/D, DPS, MMR) разъезжаются: Discord кладёт максимум 3 inline-поля в ряд,
 * и 5 полей разбиваются на два визуально разорванных ряда (3+2).
 *
 * Поэтому категорий ровно 3: "Игрок", "Герой", "K/D · DPS · MMR" — влезают
 * в один ряд Discord без разрыва.
 *
 * Внутри третьей колонки K/D, DPS и MMR — это ТРИ отдельных коротких
 * backtick-чипа с обычным (переносимым) пробелом-разделителем между ними,
 * а не одна строка в одном сплошном backtick-блоке. Один большой
 * backtick-блок Discord не переносит по частям — если он не помещается
 * по ширине, весь моноширинный текст рвётся некрасиво. Отдельные короткие
 * чипы можно перенести между собой, не повредив ни один из них изнутри.
 */
const playerNameLine = (
  player: gamePlayerStats,
  mvpName: string | null
): string => {
  const mvpTag = player.name === mvpName ? "⭐ " : "";
  return `${mvpTag}\`${player.name}\``;
};

const playerStatsLine = (
  player: gamePlayerStats,
  durationSeconds: number
): string => {
  const dps =
    durationSeconds > 0 ? Math.round(player.damage / durationSeconds) : 0;
  return `\`${player.kills}/${player.deaths}\` · \`${dps}\` · \`${formatMmrDelta(
    player.mmrDelta
  )}\``;
};

const teamFields = (
  team: gameDataByIdsGamestats["players"][number],
  durationSeconds: number,
  isWinner: boolean
) => {
  const scoreText =
    team.teamScore !== null ? ` • \`${team.teamScore}\` очков` : "";
  const statusEmoji = isWinner ? "🏆" : "☠️";

  const mvpName = findMvpName(team.teamPlayers, durationSeconds);

  return [
    {
      name: `${statusEmoji} ${team.teamName}${scoreText}`,
      value: "⎯".repeat(24),
      inline: false,
    },
    {
      name: "Игрок",
      value: team.teamPlayers
        .map((p) => playerNameLine(p, mvpName))
        .join("\n"),
      inline: true,
    },
    {
      name: "Герой",
      value: team.teamPlayers
        .map((p) => `\`${truncateHero(p.heroes)}\``)
        .join("\n"),
      inline: true,
    },
    {
      name: "K/D · DPS · MMR",
      value: team.teamPlayers
        .map((p) => playerStatsLine(p, durationSeconds))
        .join("\n"),
      inline: true,
    },
  ];
};

export const gameStatsResults = (
  gameData: gameDataByIdsGamestats,
  mapImage?: string
) => {
  const thumbnail = mapImage
    ? {
        thumbnail: {
          url: mapImage,
        },
      }
    : {};

  return {
    title: `⚔️ ${gameData.gamename}`,
    description: `🕒 \`${getPassedTime(0, gameData.duration * 1000)}\``,
    color: gameData.winnerTeam !== null ? palette.green : palette.blue,
    fields: gameData.players.flatMap((team, index) =>
      teamFields(team, gameData.duration, gameData.winnerTeam === index)
    ),
    author: {
      name: gameData.map,
    },
    footer: {
      text: "Nora • Game Summary",
    },
    timestamp: new Date(gameData.datetime),
    ...thumbnail,
  };
};
