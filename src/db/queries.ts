import { production, winEmoji, loseEmoji } from "../utils/globals";
import { parseMapName } from "../utils/lobbyParser";
import { log } from "../utils/log";
import { searchMapConfigByMapName } from "../utils/mapConfig";
import { uniqueFromArray } from "../utils/uniqueFromArray";
import { execRaw, makeQuery } from "./mysql";

export const getLobbyList = async (
  botid?: number
): Promise<Array<lobbyGame>> | null => {
  const query = `SELECT * from gamelist`;
  const result = await makeQuery(query);

  if (!result) return null;

  const lobbyList = result.filter(
    (game: lobbyGame) =>
      (game.gamename !== "" ||
        game.ownername !== "" ||
        game.creatorname !== "") &&
      (botid ? botid === game.botid : true)
  );

  return lobbyList;
};

const getPlayerWinrateStatsFromDb = async (
  nickname: string
): Promise<playerWinrateStats | null> => {
  const query = `
    select flag
    from w3mmdplayers 
    inner join gameplayers on 
        w3mmdplayers.gameid = gameplayers.gameid 
        and w3mmdplayers.pid = gameplayers.colour 
    inner join games on 
        games.id = gameplayers.gameid
    where category = 'fbtmmd' 
        and team < 2 
            and flag in ('loser', 'winner') 
        and gameplayers.name = '${nickname}'
        and duration >= 900`;

  const result = await makeQuery(query);

  if (!result || !result.length) return null;

  const parsed = result.map((obj: any) => obj.flag);

  return parsed.reduce(
    (stat: playerWinrateStats, result: string) => {
      if (result === "loser") {
        stat.lose++;
      } else {
        stat.win++;
      }
      if (stat.streak.type === result) {
        stat.streak.count++;
      } else {
        stat.streak.type = result;
        stat.streak.count = 1;
      }
      return stat;
    },
    { win: 0, lose: 0, streak: { type: "winner", count: 0 } }
  ) as playerWinrateStats;
};

export const getPlayerWinratePercent = async (
  nickname: string
): Promise<number | null> => {
  const stats = await getPlayerWinrateStatsFromDb(nickname);

  if (!stats || stats.win + stats.lose === 0) return null;

  return Math.round((stats.win / (stats.win + stats.lose)) * 100);
};

export const getPlayerWinrateForLobbyWatcher = async (
  nickname: string
): Promise<string | null> => {
  const stats = await getPlayerWinrateStatsFromDb(nickname);

  if (!stats) return null;

  return `${Math.round((stats.win / (stats.win + stats.lose)) * 100)}% | ${
    stats.win + stats.lose
  } | ${stats.streak.count} ${
    stats.streak.type == "winner" ? winEmoji : loseEmoji
  }`;
};

export const getStatsGameCount = async (
  nickname: string,
  mapName: string
): Promise<number> => {
  const query = `
    select count(*) as count
    from gameplayers
    inner join games on games.id = gameplayers.gameid
    inner join mapstats on mapstats.gameid = games.id
    where gameplayers.name in ('${nickname}') and map like '%${mapName}%';`;

  const result = await makeQuery(query);

  return result ? result[0].count : 0;
};

export const getNicknames = async () => {
  const query = `SELECT DISTINCT name FROM gameplayers where name != ' ' order by name;`;

  const result = await makeQuery(query);

  return result && result.length > 0
    ? result.map((item: any) => item.name)
    : null;
};

export const getGamesCountInfo = async (
  nickname: string,
  minIngameTime: number = 900
): Promise<null | Array<gamesCountInfo>> => {
  const query = `
    SELECT 
        count(gameid) as gamesCount, 
        group_concat(gameid) as gamesId,  
        group_concat(team) as teams,
        map
    FROM gameplayers 
    inner join games on games.id = gameplayers.gameid
    where name = '${nickname}' and duration >= ${minIngameTime}
    group by map order by gamesCount desc`;

  const result = await makeQuery(query);

  return (
    result &&
    result.map(
      (game: {
        gamesCount: number;
        gamesId: string;
        teams: string;
        map: string;
      }) => {
        return {
          gamesCount: game.gamesCount,
          gamesID: game.gamesId.split(",").map(Number),
          teams: game.teams.split(",").map(Number),
          map: parseMapName(game.map),
          mapVersion: parseMapName(game.map),
        };
      }
    )
  );
};

export const getFinishedGamesId = async () => {
  const query = `SELECT gameid as id from w3mmdplayers 
                inner join games on games.id = w3mmdplayers.gameid
                where flag in ('loser', 'winner') group by gameid`;
  const result = await makeQuery(query);
  return result ? result.map((game: any) => game.id) : null;
};

export const getPlayersByGameId = async (gamesID: Array<number>) => {
  const query = `
    SELECT 
        gameplayers.gameid,
        gameplayers.name, 
        gameplayers.team 
    FROM gameplayers
    where gameplayers.gameid in (${gamesID.join(",")}) 
    order by gameid, team`;

  const players = await makeQuery(query);

  return players as Array<{
    gameid: number;
    name: string;
    team: number;
  }> | null;
};

export const getLatestGameId = async (): Promise<number | null> => {
  const query = `SELECT id FROM games ORDER BY id DESC LIMIT 1`;
  const result = await makeQuery(query);
  if (!result || !result.length) return null;
  return result[0].id;
};

export const getGamesDataByIds = async (
  gamesID: Array<number>,
  guildID: string
): Promise<Array<gameDataByIdsGamestats> | null> => {
  try {
    const players = await getPlayersByGameId(gamesID);
    const query = `
    SELECT 
        id, 
        map, 
        datetime, 
        gamename, 
        duration 
    FROM games where id in (${gamesID.join(",")})`;
    const gamesData = await makeQuery(query);

    if (!gamesData.length || !players) return null;

    const parsedGamesData = await Promise.all(
      gamesData.map(
        async (game: {
          id: number;
          map: string;
          datetime: string;
          gamename: string;
          duration: number;
        }) => {
          const gamePlayers = players.filter(
            (player) => player.gameid === game.id
          );
          const teams = uniqueFromArray(
            gamePlayers.map((player) => player.team)
          );
          const parsedTeams = [];
          const mapConfig = await searchMapConfigByMapName(game.map, guildID);

          if (mapConfig)
            teams.forEach((team) =>
              mapConfig.slotMap[team] &&
              mapConfig.slotMap[team].name.toLowerCase() !== "spectators"
                ? parsedTeams.push(mapConfig.slotMap[team].name)
                : null
            );
          else teams.forEach((team) => parsedTeams.push(`Team ${team + 1}`));

          // Обогащаем игроков статистикой MMD (kills/deaths/damage/score/герой)
          const pidRows = await getPlayersWithPidByGameId(game.id);
          const pidByName: Record<string, number> = {};
          (pidRows || []).forEach((row) => {
            pidByName[row.name] = row.pid;
          });

          const allPids = Object.values(pidByName);
          const mmdStats = allPids.length
            ? await getPlayersMMDStats(game.id, allPids)
            : null;

          const statsByPid: Record<
            number,
            {
              kills: number;
              deaths: number;
              damage: number;
              score: number;
              heroes: string[];
            }
          > = {};
          (mmdStats || []).forEach((s: any) => {
            statsByPid[s.pid] = {
              kills: s.kills,
              deaths: s.deaths,
              damage: Number(s.damage) || 0,
              score: s.score,
              heroes: getAllHeroesPlayed(s.heroes),
            };
          });

          const enrichPlayer = (player: {
            gameid: number;
            name: string;
            team: number;
          }): gamePlayerStats => {
            const pid = pidByName[player.name];
            const stats = pid !== undefined ? statsByPid[pid] : undefined;
            return {
              ...player,
              kills: stats?.kills ?? 0,
              deaths: stats?.deaths ?? 0,
              damage: stats?.damage ?? 0,
              score: stats?.score ?? 0,
              heroes: stats?.heroes ?? [],
            };
          };

          return {
            id: game.id,
            map: parseMapName(game.map),
            datetime: new Date(game.datetime),
            gamename: game.gamename.replace(/#\d+/g, "").trim(),
            duration: game.duration,
            winnerTeam: await getWinnerTeamNumberFromId(game.id),
            players: parsedTeams.map((teamName, index) => {
              const teamPlayers = gamePlayers
                .filter((player) => player.team === index)
                .map(enrichPlayer);
              const teamScore =
                teamPlayers.length > 0
                  ? Math.max(...teamPlayers.map((p) => p.score))
                  : null;
              return { teamName, teamScore, teamPlayers };
            }),
          };
        }
      )
    );
    if (!parsedGamesData) return null;
    return parsedGamesData as Array<gameDataByIdsGamestats>;
  } catch (error) {
    log(error);
    return null;
  }
};

export const saveMapStats = async (gameID: number, winTeam: number) => {
  const query = `INSERT INTO mapstats (gameid, winteam) VALUES(${gameID}, ${winTeam})`;
  try {
    const result = await makeQuery(query);
    return true;
  } catch (error) {
    log(error);
    return null;
  }
};

export const getWinnerTeamNumberFromId = async (
  gameID: number
): Promise<number | null> => {
  const query = `SELECT team from w3mmdplayers 
                inner join gameplayers on 
                  gameplayers.colour = w3mmdplayers.pid and 
                  gameplayers.gameid = w3mmdplayers.gameid
                where gameplayers.gameid=${gameID} and flag = 'winner' group by team`;
  const result = await makeQuery(query);
  return result && (result[0].team as number);
};

// ********************* GAME STATISTIC QUERIES *********************

export const getGamesIdByPlayerNickname = async (nickname: string) => {
  const query = `SELECT w3mmdplayers.gameid
                FROM gameplayers
                left join w3mmdplayers on
                  w3mmdplayers.gameid = gameplayers.gameid 
                  and w3mmdplayers.pid = gameplayers.colour
                where gameplayers.name = '${nickname}' 
                  and gameplayers.team < 2
                  and w3mmdplayers.id`;
  const result = await makeQuery(query);
  return result && result.map((game: any) => game.gameid);
};

export const getGroupedGamesByGameid = async (games: number[]) => {
  const idToString = games.join(",");
  const query = `select 
                gameplayers.gameid, 
                  group_concat(gameplayers.name) as nicknames, 
                  duration, 
                  group_concat(team) as team,
                  group_concat(colour) as colours,
                  group_concat(flag) as flag
                from games 
                inner join gameplayers on gameplayers.gameid = games.id
                  inner join w3mmdplayers on w3mmdplayers.gameid = games.id and w3mmdplayers.pid = gameplayers.colour
                where 
                games.id in (${idToString})
                and gameplayers.team < 2
                  and games.duration > 900
                  and w3mmdplayers.flag in ('loser', 'winner')
                group by gameid, team`;
  const result = await makeQuery(query);
  if (!result) return null;

  const parsedResult = result.map((game: any) => {
    return {
      ...game,
      nicknames: game.nicknames.split(","),
      team: Number(game.team.split(",")[0]),
      colours: JSON.parse(`[${game.colours}]`),
      flag: game.flag.split(",")[0],
    };
  });
  return parsedResult;
};

export const checkPlayerWin = async (gameID: number, pid: number) => {
  const query = `select flag from w3mmdplayers where gameid = ${gameID} and pid = ${pid}`;
  const result = await makeQuery(query);
  if (!result) return null;
  return result[0] && result[0].flag === "winner";
};

export const getPlayersMMDStats = async (
  gameID: number,
  playersPID: number[]
) => {
  const pidToString = playersPID.join(",");
  const query = `select 
                  pid, 
                  group_concat(varname),
                  group_concat(value_int) as dks,
                  round(group_concat(value_real)) as damage,
                  group_concat(value_string) as heroes
                from w3mmdvars
                  where gameid = ${gameID} and pid in (${pidToString})
                group by pid`;
  const result = await makeQuery(query);

  if (!result) return null;

  return result.map((player: any) => {
    const [deaths, kills, score] = player.dks.split(",");
    return {
      pid: player.pid,
      kills: Number(kills),
      deaths: Number(deaths),
      score: Number(score),
      damage: player.damage,
      heroes: player.heroes,
    };
  });
};

export const clearLobbyGame = async (botid: number) => {
  const query = `UPDATE gamelist
                SET
                  gamename = '',
                  ownername = '',
                  creatorname = '',
                  map = '',
                  slotstaken = 0,
                  slotstotal = 0,
                  usernames = '',
                  totalgames = 0,
                  totalplayers = 0
                WHERE botid = ${botid};`;
  await makeQuery(query);
};

export const createLobbyGame = async (botid: number, mapName?: string) => {
  const fullMapName = mapName ? mapName + ".w3x" : "Creating game...";
  const query = `UPDATE gamelist
                SET
                  gamename = '${production ? "res publica game" : "test"}',
                  ownername = 'replica',
                  creatorname = 'replica',
                  map = '${fullMapName || "Creating game..."}',
                  slotstaken = 0,
                  slotstotal = 1,
                  usernames = '',
                  totalgames = 1,
                  totalplayers = 0
                WHERE botid = ${botid};`;
  await makeQuery(query);
};

// ********************* HERO STATISTICS QUERIES *********************

/**
 * Декодирует HTML-сущности, в которые MMD-код карты кодирует спецсимволы
 * в именах героев (например, "Flanders &amp; Zamasu" -> "Flanders & Zamasu")
 */
const decodeHtmlEntities = (str: string): string =>
  str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/**
 * MMD оборачивает весь список пиков в одну пару двойных кавычек
 * (например: "Hero1,Hero2,Hero3"), а не каждого героя по отдельности.
 * Из-за этого при взятии последнего элемента списка через запятую
 * закрывающая кавычка остаётся приклеенной к последнему герою,
 * а открывающая — только к первому. Убираем кавычки по краям каждого куска.
 */
const stripQuotes = (str: string): string => str.replace(/^"+|"+$/g, "");

/**
 * MySQL называет свою кодировку "latin1", но по факту она реализована как
 * Windows-1252, а не настоящая ISO-8859-1 — в диапазоне 0x80-0x9F они
 * расходятся (там, где в ISO-8859-1 управляющие символы, в Windows-1252
 * реальные печатные: —, œ, „, € и т.д.). Именно эти символы и появляются
 * в подписанных именах героев (кириллица/корейский/китайский), когда
 * MySQL-соединение неверно перекодирует UTF-8-байты через latin1(cp1252)
 * при передаче клиенту.
 */
const CP1252_HIGH_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/**
 * Кодирует JS-строку (составленную из codepoints, полученных при неверном
 * декодировании сырых байт как Windows-1252) обратно в исходные байты.
 * Возвращает null, если встретился codepoint вне диапазона latin1/cp1252 —
 * значит, строка испорчена не этим способом, и восстановить нельзя.
 */
const encodeAsWindows1252 = (str: string): Buffer | null => {
  const bytes: number[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0) as number;
    if (cp <= 0x7f) {
      bytes.push(cp);
    } else if (CP1252_HIGH_TO_BYTE[cp] !== undefined) {
      bytes.push(CP1252_HIGH_TO_BYTE[cp]);
    } else if (cp <= 0xff) {
      bytes.push(cp);
    } else {
      return null;
    }
  }
  return Buffer.from(bytes);
};

/**
 * Попытка восстановить текст после неверной перекодировки UTF-8 байт через
 * MySQL-соединение с charset latin1(cp1252). Если результат выглядит хуже
 * (остаются replacement characters или найден codepoint вне диапазона),
 * возвращаем исходную строку без изменений.
 */
const fixMojibake = (str: string): string => {
  const bytes = encodeAsWindows1252(str);
  if (!bytes) return str;
  const attempt = bytes.toString("utf8");
  if (attempt.includes("\uFFFD")) return str;
  return attempt;
};

const TRUNCATION_MARKER = "...";

/**
 * Игрок может пересаживаться на героя несколько раз за матч (респавн/смерть),
 * из-за чего один и тот же (или разные) герой может повторяться через запятую.
 * Финальным считается последний герой в списке.
 * Например: "Arthas,Lich,Lich" -> "Lich"
 *
 * БД обрезает всю строку пиков, если она длиннее ~70 символов, дописывая
 * "...". В этом случае последний герой в списке обрезан и не может быть
 * надёжно определён — если в списке есть герой перед ним, берём его
 * (он гарантированно цел), а не считаем "..." отдельным героем.
 * Если обрезанный герой единственный в списке — восстановить нечего,
 * возвращаем null.
 */
const getFinalHero = (heroesString: string): string | null => {
  if (!heroesString) return null;

  const isTruncated = stripQuotes(heroesString.trimEnd()).endsWith(
    TRUNCATION_MARKER
  );

  const heroes = heroesString
    .split(",")
    .map((hero) => fixMojibake(decodeHtmlEntities(stripQuotes(hero.trim()))))
    .filter((hero) => hero.length > 0);

  if (heroes.length === 0) return null;

  if (isTruncated) {
    // Последний элемент списка обрезан — отбрасываем его и берём
    // предпоследнего (целого) героя, если он есть
    return heroes.length >= 2 ? heroes[heroes.length - 2] : null;
  }

  return heroes[heroes.length - 1];
};

/**
 * В отличие от getFinalHero (нужен для статистики "герой = последний пик
 * за игру"), здесь возвращаются ВСЕ герои, на которых играл игрок за матч —
 * для отображения в сводке игры. Повторные пересадки на одного и того же
 * героя (респавн/смерть) схлопываются в одно вхождение, порядок — по
 * первому появлению в списке.
 *
 * Если строка обрезана БД (см. getFinalHero), последний неполный элемент
 * отбрасывается — остальные герои в списке гарантированно целые.
 */
const getAllHeroesPlayed = (heroesString: string): string[] => {
  if (!heroesString) return [];

  const isTruncated = stripQuotes(heroesString.trimEnd()).endsWith(
    TRUNCATION_MARKER
  );

  const heroes = heroesString
    .split(",")
    .map((hero) => fixMojibake(decodeHtmlEntities(stripQuotes(hero.trim()))))
    .filter((hero) => hero.length > 0);

  const validHeroes = isTruncated ? heroes.slice(0, -1) : heroes;

  return [...new Set(validHeroes)];
};

export const getHeroStatsForPlayer = async (nickname: string) => {
  const query = `
    SELECT 
        w3mmdvars.value_string as heroes,
        w3mmdplayers.gameid,
        w3mmdplayers.flag
    FROM w3mmdvars
    INNER JOIN w3mmdplayers ON w3mmdvars.gameid = w3mmdplayers.gameid AND w3mmdvars.pid = w3mmdplayers.pid
    INNER JOIN gameplayers ON gameplayers.gameid = w3mmdvars.gameid AND gameplayers.colour = w3mmdvars.pid
    INNER JOIN games ON games.id = w3mmdvars.gameid
    WHERE w3mmdvars.varname = 'hero' 
        AND gameplayers.name = '${nickname}'
        AND w3mmdplayers.flag IN ('winner', 'loser')
        AND games.duration >= 900`;

  const result = await makeQuery(query);
  
  if (!result || result.length === 0) return null;
  
  // Группируем по героям
  const heroStats: { [key: string]: { wins: number; total: number } } = {};
  
  result.forEach((row: any) => {
    const hero = getFinalHero(row.heroes);
    if (!hero) return;
    const isWin = row.flag === "winner" ? 1 : 0;
    
    if (!heroStats[hero]) {
      heroStats[hero] = { wins: 0, total: 0 };
    }
    heroStats[hero].total++;
    heroStats[hero].wins += isWin;
  });
  
  return Object.entries(heroStats).map(([heroName, stats]) => ({
    heroName,
    totalGames: stats.total,
    wins: stats.wins,
  }));
};

export const getHeroWinrateStats = async (nickname: string) => {
  const query = `
    SELECT 
        w3mmdvars.value_string as heroes,
        w3mmdplayers.gameid,
        w3mmdplayers.flag
    FROM w3mmdvars
    INNER JOIN w3mmdplayers ON w3mmdvars.gameid = w3mmdplayers.gameid AND w3mmdvars.pid = w3mmdplayers.pid
    INNER JOIN gameplayers ON gameplayers.gameid = w3mmdvars.gameid AND gameplayers.colour = w3mmdvars.pid
    INNER JOIN games ON games.id = w3mmdvars.gameid
    WHERE w3mmdvars.varname = 'hero'
        AND gameplayers.name = '${nickname}'
        AND w3mmdplayers.flag IN ('winner', 'loser')
        AND games.duration >= 900`;

  const result = await makeQuery(query);
  
  if (!result || result.length === 0) return null;
  
  // Группируем по героям
  const heroStats: { [key: string]: { wins: number; total: number } } = {};
  
  result.forEach((row: any) => {
    const hero = getFinalHero(row.heroes);
    if (!hero) return;
    const isWin = row.flag === "winner" ? 1 : 0;
    
    if (!heroStats[hero]) {
      heroStats[hero] = { wins: 0, total: 0 };
    }
    heroStats[hero].total++;
    heroStats[hero].wins += isWin;
  });
  
  // Сортируем по проценту побед (потом по количеству игр)
  return Object.entries(heroStats)
    .map(([heroName, stats]) => ({
      heroName,
      totalGames: stats.total,
      wins: stats.wins,
    }))
    .sort((a, b) => {
      const wrA = (a.wins / a.totalGames) * 100;
      const wrB = (b.wins / b.totalGames) * 100;
      return wrB - wrA;
    });
};

export const getHeroLeaderboard = async () => {
  const query = `
    SELECT 
        w3mmdvars.value_string as heroes,
        w3mmdplayers.gameid,
        w3mmdplayers.flag,
        gameplayers.name
    FROM w3mmdvars
    INNER JOIN w3mmdplayers ON w3mmdvars.gameid = w3mmdplayers.gameid AND w3mmdvars.pid = w3mmdplayers.pid
    INNER JOIN gameplayers ON gameplayers.gameid = w3mmdvars.gameid AND gameplayers.colour = w3mmdvars.pid
    INNER JOIN games ON games.id = w3mmdvars.gameid
    WHERE w3mmdvars.varname = 'hero'
        AND w3mmdplayers.flag IN ('winner', 'loser')
        AND games.duration >= 900`;

  const result = await makeQuery(query);
  
  if (!result || result.length === 0) return null;
  
  // Группируем по героям
  const heroStats: { 
    [key: string]: { 
      wins: number; 
      total: number; 
      players: Set<string>;
    } 
  } = {};
  
  result.forEach((row: any) => {
    const hero = getFinalHero(row.heroes);
    if (!hero) return;
    const isWin = row.flag === "winner" ? 1 : 0;
    
    if (!heroStats[hero]) {
      heroStats[hero] = { wins: 0, total: 0, players: new Set() };
    }
    heroStats[hero].total++;
    heroStats[hero].wins += isWin;
    heroStats[hero].players.add(row.name);
  });
  
  // Сортируем по количеству игр
  return Object.entries(heroStats)
    .map(([heroName, stats]) => ({
      heroName,
      totalGames: stats.total,
      wins: stats.wins,
      uniquePlayers: stats.players.size,
    }))
    .sort((a, b) => b.totalGames - a.totalGames)
    .slice(0, 100);
};

// ********************* MMR QUERIES *********************

/**
 * Создаёт таблицу player_mmr, если её ещё нет (CREATE TABLE IF NOT EXISTS —
 * безопасно вызывать при каждом старте бота). Убирает необходимость
 * вручную гонять SQL-миграцию.
 */
export const ensurePlayerMmrTable = async (): Promise<boolean> => {
  const query = `CREATE TABLE IF NOT EXISTS player_mmr (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildID VARCHAR(64) NOT NULL,
    mapConfigName VARCHAR(128) NOT NULL,
    nickname VARCHAR(128) NOT NULL,
    mmr INT NOT NULL DEFAULT 1500,
    gamesPlayed INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_player_map (guildID, mapConfigName, nickname)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

  const result = await execRaw(query);
  if (!result) log("[mmr] failed to ensure player_mmr table");
  return result;
};

export const getPlayersWithPidByGameId = async (gameID: number) => {
  const query = `SELECT 
                  gameplayers.name, 
                  gameplayers.team, 
                  gameplayers.colour as pid
                FROM gameplayers
                where gameplayers.gameid = ${gameID}`;
  const result = await makeQuery(query);
  return result as Array<{ name: string; team: number; pid: number }> | null;
};

export const DEFAULT_MMR = 1500;

/**
 * Забирает текущий MMR игроков одним запросом. Для игроков без записи
 * в таблице (первая ranked-игра) возвращает значение по умолчанию.
 */
export const getPlayersMmrBulk = async (
  guildID: string,
  mapConfigName: string,
  nicknames: string[]
): Promise<Record<string, playerMmr>> => {
  const uniqueNicknames = [...new Set(nicknames)];
  const nicknamesList = uniqueNicknames.map((n) => `'${n}'`).join(",");
  const query = `SELECT nickname, mmr, gamesPlayed, wins, losses
                FROM player_mmr
                where guildID = '${guildID}' 
                  and mapConfigName = '${mapConfigName}'
                  and nickname in (${nicknamesList})`;
  const result = await makeQuery(query);

  const byNickname: Record<string, playerMmr> = {};
  (result || []).forEach((row: any) => {
    byNickname[row.nickname] = {
      nickname: row.nickname,
      mmr: row.mmr,
      gamesPlayed: row.gamesPlayed,
      wins: row.wins,
      losses: row.losses,
    };
  });

  uniqueNicknames.forEach((nickname) => {
    if (!byNickname[nickname]) {
      byNickname[nickname] = {
        nickname,
        mmr: DEFAULT_MMR,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
      };
    }
  });

  return byNickname;
};

export const getPlayerMmr = async (
  guildID: string,
  mapConfigName: string,
  nickname: string
): Promise<playerMmr> => {
  const result = await getPlayersMmrBulk(guildID, mapConfigName, [nickname]);
  return result[nickname];
};

/**
 * Для отображения в лобби-вотчере: null, если у игрока ещё нет ни одной
 * сыгранной ranked-игры на этом конфиге (тогда в лобби покажется "-",
 * как раньше было "unranked" для винрейта), иначе MMR строкой.
 */
export const getPlayerMmrForLobbyWatcher = async (
  guildID: string,
  mapConfigName: string,
  nickname: string
): Promise<string | null> => {
  const result = await getPlayerMmr(guildID, mapConfigName, nickname);
  if (!result || result.gamesPlayed === 0) return null;
  return `${result.mmr}`;
};

/**
 * Обновляет MMR нескольких игроков одним запросом (по одному INSERT ...
 * ON DUPLICATE KEY UPDATE на игрока, но в одном пакете промисов).
 */
export const upsertPlayersMmr = async (
  guildID: string,
  mapConfigName: string,
  updates: Array<{ nickname: string; newMmr: number; isWin: boolean }>
): Promise<void> => {
  await Promise.all(
    updates.map(({ nickname, newMmr, isWin }) => {
      const query = `INSERT INTO player_mmr 
                      (guildID, mapConfigName, nickname, mmr, gamesPlayed, wins, losses)
                    VALUES 
                      ('${guildID}', '${mapConfigName}', '${nickname}', ${newMmr}, 1, ${
        isWin ? 1 : 0
      }, ${isWin ? 0 : 1})
                    ON DUPLICATE KEY UPDATE
                      mmr = ${newMmr},
                      gamesPlayed = gamesPlayed + 1,
                      wins = wins + ${isWin ? 1 : 0},
                      losses = losses + ${isWin ? 0 : 1}`;
      return makeQuery(query);
    })
  );
};

export const getMmrLeaderboard = async (
  guildID: string,
  mapConfigName: string,
  limit: number = 25
): Promise<mmrLeaderboardEntry[] | null> => {
  const query = `SELECT nickname, mmr, gamesPlayed, wins, losses
                FROM player_mmr
                where guildID = '${guildID}' 
                  and mapConfigName = '${mapConfigName}'
                  and gamesPlayed > 0
                order by mmr desc
                limit ${limit}`;
  const result = await makeQuery(query);
  if (!result) return null;
  return result.map((row: any) => ({
    nickname: row.nickname,
    mmr: row.mmr,
    gamesPlayed: row.gamesPlayed,
    wins: row.wins,
    losses: row.losses,
  }));
};
