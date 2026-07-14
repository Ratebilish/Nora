import { displayWidth, padDisplay } from "../utils/stringDecorations";

type heroStatEntry = {
  heroName: string;
  totalGames: number;
  wins: number;
};

type heroLeaderboardEntry = heroStatEntry & {
  uniquePlayers: number;
};

const winratePercent = (wins: number, totalGames: number): string =>
  totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0";

// Ограничиваем визуальную длину имени героя в таблице, чтобы одна аномально
// длинная (например, повреждённая) запись не растягивала всю колонку
const MAX_NAME_WIDTH = 24;

const truncateName = (name: string): string => {
  if (displayWidth(name) <= MAX_NAME_WIDTH) return name;
  let result = "";
  for (const ch of name) {
    if (displayWidth(result + ch) > MAX_NAME_WIDTH - 1) break;
    result += ch;
  }
  return `${result}…`;
};

export const heroStatsSummary = (
  nickname: string,
  heroStats: heroStatEntry[]
) => {
  const rows = [...heroStats]
    .sort((a, b) => b.totalGames - a.totalGames)
    .slice(0, 25)
    .map((hero) => ({
      name: truncateName(hero.heroName),
      games: `${hero.totalGames}`,
      winStat: `${hero.wins} (${winratePercent(hero.wins, hero.totalGames)}%)`,
    }));

  const nameWidth = Math.max(4, ...rows.map((r) => displayWidth(r.name)));
  const gamesWidth = Math.max(5, ...rows.map((r) => r.games.length));

  const header = `${padDisplay(nameWidth, "Hero")} | ${padDisplay(
    gamesWidth,
    "Games"
  )} | Wins (WR)`;

  const table = rows
    .map(
      (r) =>
        `${padDisplay(nameWidth, r.name)} | ${padDisplay(
          gamesWidth,
          r.games
        )} | ${r.winStat}`
    )
    .join("\n");

  return {
    color: 0x0099ff,
    description: `Hero stats sorted by total games played\n\`\`\`\n${header}\n${"-".repeat(
      displayWidth(header)
    )}\n${table}\n\`\`\``,
    author: {
      name: `Hero Statistics for ${nickname}`,
    },
    footer: {
      text: `${heroStats.length} heroes tracked`,
    },
  };
};

export const heroWinrateStats = (
  nickname: string,
  heroWinrates: heroStatEntry[],
  minGames: number = 3
) => {
  const filtered = heroWinrates
    .filter((hero) => hero.totalGames >= minGames)
    .sort((a, b) => {
      const wrA = (a.wins / a.totalGames) * 100;
      const wrB = (b.wins / b.totalGames) * 100;
      return wrB - wrA;
    })
    .slice(0, 20);

  const rows = filtered.map((hero, index) => ({
    index: `${index + 1}`,
    name: truncateName(hero.heroName),
    winStat: `${winratePercent(hero.wins, hero.totalGames)}% (${hero.wins}W-${
      hero.totalGames - hero.wins
    }L)`,
  }));

  const indexWidth = Math.max(2, ...rows.map((r) => r.index.length));
  const nameWidth = Math.max(4, ...rows.map((r) => displayWidth(r.name)));

  const header = `${padDisplay(indexWidth, "#")} | ${padDisplay(
    nameWidth,
    "Hero"
  )} | WR (W-L)`;

  const table = rows
    .map(
      (r) =>
        `${padDisplay(indexWidth, r.index)} | ${padDisplay(
          nameWidth,
          r.name
        )} | ${r.winStat}`
    )
    .join("\n");

  return {
    color: 0x0099ff,
    description: `Heroes sorted by winrate (minimum ${minGames} games)\n\`\`\`\n${header}\n${"-".repeat(
      displayWidth(header)
    )}\n${table}\n\`\`\``,
    author: {
      name: `Hero Winrate Statistics for ${nickname}`,
    },
    footer: {
      text: `${heroWinrates.length} unique heroes`,
    },
  };
};

export const heroLeaderboard = (heroBoard: heroLeaderboardEntry[]) => {
  const top = heroBoard.slice(0, 25);

  const rows = top.map((hero, index) => ({
    index: `${index + 1}`,
    name: truncateName(hero.heroName),
    stat: `${hero.totalGames} | ${hero.wins} (${winratePercent(
      hero.wins,
      hero.totalGames
    )}%) | ${hero.uniquePlayers}`,
  }));

  const indexWidth = Math.max(2, ...rows.map((r) => r.index.length));
  const nameWidth = Math.max(4, ...rows.map((r) => displayWidth(r.name)));

  const header = `${padDisplay(indexWidth, "#")} | ${padDisplay(
    nameWidth,
    "Hero"
  )} | Games | Wins (WR) | Players`;

  const table = rows
    .map(
      (r) =>
        `${padDisplay(indexWidth, r.index)} | ${padDisplay(
          nameWidth,
          r.name
        )} | ${r.stat}`
    )
    .join("\n");

  return {
    color: 0x0099ff,
    description: `Heroes sorted by total games played\n\`\`\`\n${header}\n${"-".repeat(
      displayWidth(header)
    )}\n${table}\n\`\`\``,
    author: {
      name: "Hero Usage Leaderboard",
    },
    footer: {
      text: `Total heroes tracked: ${heroBoard.length}`,
    },
  };
};
