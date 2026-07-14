import { DEFAULT_MMR, getLobbyList, getPlayerMmr } from "../db/queries";
import { defaultFbtMapConfig } from "./globals";
import { parseMapName } from "./lobbyParser";
import { searchMapConfigByMapName } from "./mapConfig";

const MIN_PLAYERS_TO_SHUFFLE = 2;

type LobbySlotPlayer = {
  slot: number;
  name: string;
  mmr: number;
};

type TeamRange = {
  startSlot: number;
  slots: number;
  isSpectator: boolean;
};

export type WinrateShufflePlan =
  | { ok: true; swaps: Array<[number, number]> }
  | {
      ok: false;
      reason:
        | "no_game"
        | "ranking_disabled"
        | "not_enough_players"
        | "already_balanced"
        | "no_playable_teams";
    };

const parseRawSlots = (usernames: string, totalSlots: number) => {
  const parts = usernames.split("\t");
  const slots: Array<string | null> = [];

  for (let i = 0; i < totalSlots; i++) {
    const name = parts.shift()?.trim();
    parts.shift();
    parts.shift();
    slots.push(name ? name : null);
  }

  return slots;
};

const getTeamRanges = (slotMap: Array<mapConfigSlotMap>): TeamRange[] => {
  let startSlot = 0;

  return slotMap.map((team) => {
    const range = {
      startSlot,
      slots: team.slots,
      isSpectator: team.name.toLowerCase() === "spectators",
    };
    startSlot += team.slots;
    return range;
  });
};

const snakeDraft = <T>(players: T[], teamCount: number): T[][] => {
  const teams = Array.from({ length: teamCount }, () => [] as T[]);

  if (teamCount === 0) return teams;

  let teamIndex = 0;
  let direction = 1;

  for (const player of players) {
    teams[teamIndex].push(player);

    if (teamCount === 1) continue;

    teamIndex += direction;

    if (teamIndex >= teamCount) {
      teamIndex = teamCount - 1;
      direction = -1;
    } else if (teamIndex < 0) {
      teamIndex = 0;
      direction = 1;
    }
  }

  return teams;
};

// Выше этого числа игроков полный перебор (2^n подмножеств) уже не мгновенный —
// в реальных лобби WC3 игроков обычно ≤12, так что порог даёт большой запас
const EXHAUSTIVE_SEARCH_MAX_PLAYERS = 20;

/**
 * Точный перебор для 2 играбельных команд: находит разбиение с минимальной
 * разницей суммарного винрейта команд, при точном соблюдении вместимости
 * каждой (capA/capB). В отличие от snake draft, который балансирует по
 * РАНГУ (позиции в отсортированном списке) и может ощутимо проигрывать при
 * кластеризации/больших разрывах в скилле, перебор всех 2^n подмножеств
 * гарантированно находит математически лучшее из всех возможных разбиений.
 * Для n ≤ 20 игроков выполняется за миллисекунды.
 */
const bestBalancedSplit = (
  players: LobbySlotPlayer[],
  capA: number,
  capB: number
): [LobbySlotPlayer[], LobbySlotPlayer[]] | null => {
  const n = players.length;
  if (n > capA + capB) return null;

  const totalSum = players.reduce((sum, p) => sum + p.mmr, 0);
  const totalSubsets = 1 << n;

  let bestDiff = Infinity;
  let bestMaskA = 0;

  for (let mask = 0; mask < totalSubsets; mask++) {
    let sizeA = 0;
    let sumA = 0;

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sizeA++;
        sumA += players[i].mmr;
      }
    }

    const sizeB = n - sizeA;
    if (sizeA > capA || sizeB > capB) continue;

    const diff = Math.abs(sumA - (totalSum - sumA));

    if (diff < bestDiff) {
      bestDiff = diff;
      bestMaskA = mask;
    }
  }

  const teamA: LobbySlotPlayer[] = [];
  const teamB: LobbySlotPlayer[] = [];

  for (let i = 0; i < n; i++) {
    if (bestMaskA & (1 << i)) {
      teamA.push(players[i]);
    } else {
      teamB.push(players[i]);
    }
  }

  return [teamA, teamB];
};

const computeSwaps = (
  current: Array<string | null>,
  target: Array<string | null>
): Array<[number, number]> => {
  const swaps: Array<[number, number]> = [];
  const state = [...current];

  for (let i = 0; i < state.length; i++) {
    const wanted = target[i];

    if (wanted === null || state[i] === wanted) continue;

    const swapIndex = state.findIndex(
      (name, index) => name === wanted && index !== i
    );

    if (swapIndex === -1) continue;

    swaps.push([i, swapIndex]);
    [state[i], state[swapIndex]] = [state[swapIndex], state[i]];
  }

  return swaps;
};

const buildTargetSlots = (
  players: LobbySlotPlayer[],
  teamRanges: TeamRange[],
  totalSlots: number
) => {
  const playableRanges = teamRanges.filter((range) => !range.isSpectator);

  if (playableRanges.length === 0) return null;

  const target = Array<string | null>(totalSlots).fill(null);

  if (
    playableRanges.length === 2 &&
    players.length <= EXHAUSTIVE_SEARCH_MAX_PLAYERS
  ) {
    const [rangeA, rangeB] = playableRanges;
    const split = bestBalancedSplit(players, rangeA.slots, rangeB.slots);

    if (split) {
      const [teamA, teamB] = split;

      teamA.forEach((player, slotOffset) => {
        target[rangeA.startSlot + slotOffset] = player.name;
      });
      teamB.forEach((player, slotOffset) => {
        target[rangeB.startSlot + slotOffset] = player.name;
      });

      return target;
    }
  }

  // Резервный вариант: 3+ играбельных команды или слишком большое лобби
  // для полного перебора — snake draft (балансирует по рангу, не всегда
  // оптимально, но работает для любого числа команд и быстро всегда)
  const sortedPlayers = [...players].sort((a, b) => b.mmr - a.mmr);
  const draftedTeams = snakeDraft(sortedPlayers, playableRanges.length);

  draftedTeams.forEach((teamPlayers, teamIndex) => {
    const { startSlot, slots } = playableRanges[teamIndex];

    teamPlayers.forEach((player, slotOffset) => {
      if (slotOffset < slots) {
        target[startSlot + slotOffset] = player.name;
      }
    });
  });

  return target;
};

export const buildWinrateShufflePlan = async (
  guildID: string,
  botid: number
): Promise<WinrateShufflePlan> => {
  const rawGames = await getLobbyList(botid);

  if (!rawGames) return { ok: false, reason: "no_game" };

  const rawGame = rawGames.find((game) => game.botid === botid);

  if (!rawGame) return { ok: false, reason: "no_game" };

  const mapName = parseMapName(rawGame.map);
  const config =
    (await searchMapConfigByMapName(mapName, guildID)) ||
    defaultFbtMapConfig(guildID);

  if (!config.options.ranking) {
    return { ok: false, reason: "ranking_disabled" };
  }

  const teamRanges = getTeamRanges(config.slotMap);
  const playableRanges = teamRanges.filter((range) => !range.isSpectator);

  if (playableRanges.length === 0) {
    return { ok: false, reason: "no_playable_teams" };
  }

  const currentSlots = parseRawSlots(rawGame.usernames, config.slots);
  const playableSlotSet = new Set<number>();

  playableRanges.forEach(({ startSlot, slots }) => {
    for (let slot = startSlot; slot < startSlot + slots; slot++) {
      playableSlotSet.add(slot);
    }
  });

  const players = (
    await Promise.all(
      currentSlots.map(async (name, slot) => {
        if (!playableSlotSet.has(slot) || !name) return null;

        const playerMmrData = await getPlayerMmr(guildID, config.name, name);
        const mmr = playerMmrData ? playerMmrData.mmr : DEFAULT_MMR;

        return { slot, name, mmr };
      })
    )
  ).filter((player): player is LobbySlotPlayer => player !== null);

  if (players.length < MIN_PLAYERS_TO_SHUFFLE) {
    return { ok: false, reason: "not_enough_players" };
  }

  const targetSlots = buildTargetSlots(players, teamRanges, config.slots);

  if (!targetSlots) {
    return { ok: false, reason: "no_playable_teams" };
  }

  const currentPlayable = currentSlots.map((name, slot) =>
    playableSlotSet.has(slot) ? name : null
  );
  const targetPlayable = targetSlots.map((name, slot) =>
    playableSlotSet.has(slot) ? name : null
  );

  const swaps = computeSwaps(currentPlayable, targetPlayable);

  if (swaps.length === 0) {
    return { ok: false, reason: "already_balanced" };
  }

  return { ok: true, swaps };
};
