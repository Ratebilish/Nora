import { displayWidth, padDisplay } from "../utils/stringDecorations";

const winratePercent = (wins: number, total: number): string =>
  total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

export const mmrProfile = (
  nickname: string,
  mapConfigName: string,
  profile: playerMmr
) => {
  return {
    color: 0x0099ff,
    description:
      profile.gamesPlayed > 0
        ? `\`\`\`\nMMR:    ${profile.mmr}\nGames:  ${profile.gamesPlayed}\nWins:   ${profile.wins}\nLosses: ${profile.losses}\nWR:     ${winratePercent(profile.wins, profile.gamesPlayed)}%\n\`\`\``
        : "No ranked games played on this map config yet.",
    author: {
      name: `MMR for ${nickname} — ${mapConfigName}`,
    },
  };
};

export const mmrLeaderboard = (
  mapConfigName: string,
  board: mmrLeaderboardEntry[]
) => {
  const MAX_NAME_WIDTH = 20;
  const truncateName = (name: string): string => {
    if (displayWidth(name) <= MAX_NAME_WIDTH) return name;
    let result = "";
    for (const ch of name) {
      if (displayWidth(result + ch) > MAX_NAME_WIDTH - 1) break;
      result += ch;
    }
    return `${result}…`;
  };

  const rows = board.map((p, index) => ({
    index: `${index + 1}`,
    name: truncateName(p.nickname),
    mmr: `${p.mmr}`,
    record: `${p.wins}W-${p.losses}L (${winratePercent(p.wins, p.gamesPlayed)}%)`,
  }));

  const indexWidth = Math.max(2, ...rows.map((r) => r.index.length));
  const nameWidth = Math.max(4, ...rows.map((r) => displayWidth(r.name)));
  const mmrWidth = Math.max(3, ...rows.map((r) => r.mmr.length));

  const header = `${padDisplay(indexWidth, "#")} | ${padDisplay(
    nameWidth,
    "Player"
  )} | ${padDisplay(mmrWidth, "MMR")} | Record`;

  const table = rows
    .map(
      (r) =>
        `${padDisplay(indexWidth, r.index)} | ${padDisplay(
          nameWidth,
          r.name
        )} | ${padDisplay(mmrWidth, r.mmr)} | ${r.record}`
    )
    .join("\n");

  return {
    color: 0x0099ff,
    description: `\`\`\`\n${header}\n${"-".repeat(
      displayWidth(header)
    )}\n${table}\n\`\`\``,
    author: {
      name: `MMR Leaderboard — ${mapConfigName}`,
    },
    footer: {
      text: `${board.length} ranked players`,
    },
  };
};
