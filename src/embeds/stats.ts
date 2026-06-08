import { getWinrateColor } from "../utils/colorParsers";
import { loseEmoji, winEmoji } from "../utils/globals";
import { SPACE } from "../utils/lobbyParser";
import { fillSpaces } from "../utils/stringDecorations";

export const totalGamesForNickname = (
  nickname: string,
  games: gamesCountGroupedInfo
) => {
  return {
    description: `${games.groupedGames
      .map((group) => {
        if (group.versions.length === 1)
          return `:map: [**${group.totalGames}**] __${group.versions[0].mapVersion}__`;
        return `:map: [**${group.totalGames}**] __${group.map}__\n
            ${group.versions
              .map(
                (version) =>
                  `> :small_blue_diamond: [**${version.gamesCount}**] ${version.mapVersion}`
              )
              .join("\n")}`;
      })
      .join("\n\n")}`,
    color: null,
    author: {
      name: `All games for ${nickname}`,
      icon_url: "https://i.ibb.co/Sv1QcyN/BTN-3.png",
    },
    footer: {
      text: `${games.totalGamesCount} games`,
    },
  };
};

export const playerWinrate = ({
  stats,
  playersType,
  sortFunc,
  sortDescription,
  page,
  maxPage,
  itemsOnPage,
  userAvatar,
}: {
  stats: playerWinStats;
  playersType: "teammates" | "enemies" | string;
  sortFunc: (a: any, b: any) => number;
  sortDescription: "winrate" | "games" | string;
  page: number;
  maxPage: number;
  itemsOnPage: number;
  userAvatar: string;
}) => {
  const thumbnail = userAvatar && {
    thumbnail: {
      url: userAvatar,
    },
  };

  return {
    title: `${stats.player.nickname} 🔸 ${stats.player.percent}% 🔸\n\n[ ${winEmoji} ${stats.player.win} | ${loseEmoji} ${stats.player.lose} ]`,
    description: `‎‏‏${SPACE}\n${
      playersType === "teammates"
        ? "🤝 __Teammates ranking__ 🤝"
        : "😈 __Enemies ranking__ 😈"
    }
      
          Most ${sortDescription} ${
      playersType === "teammates" ? "with you in team" : "against you"
    }

          ${[...stats[playersType]]
            .sort(sortFunc)
            .splice((page - 1) * itemsOnPage, itemsOnPage)
            .map(
              ({ nickname, win, lose, percent }) =>
                `\`${nickname}\`\n> **${percent}%** 🔸 [ ${winEmoji} **${win}** | ${loseEmoji} **${lose}** ]`
            )
            .join("\n\n")} `,
    color: getWinrateColor(stats.player.percent),
    author: {
      name: "📝FBT winrate stats 📝",
    },
    footer: {
      text: `${stats.player.win + stats.player.lose} games ● ${
        stats[playersType].length
      } ${playersType} ● page ${page}/${maxPage}`,
    },
    ...thumbnail,
  };
};

export const leaderboardDamage = (stats: damageStatsInfo) => {
  const [maxDRPlength, maxTotalDamageLength] = stats.players.reduce(
    (prev, player) => {
      return [
        Math.max(prev[0], player.dpr.toLocaleString().length),
        Math.max(prev[1], player.totalDmg.toLocaleString().length),
      ];
    },
    [0, 0]
  );

  return {
    color: 0xcc4949,
    fields: [
      {
        name: "FAQ",
        value: `🗡️ *Damage per round*\n⚔️ *Total damage*\n\n\`2x2 and 3x3 only\`\n\n__Games threshold:__ **${stats.threshold}**`,
      },
      {
        name: "#",
        value: stats.players
          .map((_, index: number) => `\`${index + 1}\``)
          .join("\n"),
        inline: true,
      },
      {
        name: "Nickname",
        value: stats.players
          .map((player) => `\`${player.nickname}\``)
          .join("\n"),
        inline: true,
      },
      {
        name:
          "‎‏‏‎‎‏‏‎ ‎‏‏‎ ‎‏‏‎ ‎‏‏‎ ‎‏‏‎ ‎‏‏‎ :dagger:     |         :crossed_swords:",
        value: stats.players
          .map(
            (player) =>
              `\`${player.dpr.toLocaleString()}${fillSpaces(
                maxDRPlength - player.dpr.toLocaleString().length
              )} | ${fillSpaces(
                maxTotalDamageLength - player.totalDmg.toLocaleString().length
              )}${player.totalDmg.toLocaleString()}\``
          )
          .join("\n"),
        inline: true,
      },
    ],
    author: {
      name: "Leaderboard • DAMAGE",
    },
    footer: {
      text: `${stats.totalGames} 🎮 • ${stats.totalDamage.toLocaleString()} ⚔️`,
    },
  };
};
