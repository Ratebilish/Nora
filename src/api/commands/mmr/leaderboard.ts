import { ChatInputCommandInteraction } from "discord.js";
import { getMmrLeaderboard } from "../../../db/queries";
import { mmrLeaderboard } from "../../../embeds/mmr";
import { warning } from "../../../embeds/response";
import { editReply } from "../../../utils/discordMessage";
import { defaultMapConfigName, msgDeleteTimeout } from "../../../utils/globals";
import { searchMapConfigByName } from "../../../utils/mapConfig";

export const leaderboard = async (
  interaction: ChatInputCommandInteraction
) => {
  const mapConfigName =
    interaction.options.getString("mapconfig") || defaultMapConfigName;

  const config = await searchMapConfigByName(mapConfigName, interaction.guildId);
  if (!config) {
    await editReply(
      interaction,
      { embeds: [warning(`No map config named "${mapConfigName}"`) as any] },
      msgDeleteTimeout.default
    );
    return;
  }
  if (config.options.ranking === false) {
    await editReply(
      interaction,
      {
        embeds: [
          warning(`Ranking is not enabled for map config "${mapConfigName}"`) as any,
        ],
      },
      msgDeleteTimeout.default
    );
    return;
  }

  const board = await getMmrLeaderboard(interaction.guildId, mapConfigName);

  if (!board || board.length === 0) {
    await editReply(
      interaction,
      {
        embeds: [
          warning(`No ranked games played yet on "${mapConfigName}"`) as any,
        ],
      },
      msgDeleteTimeout.long
    );
    return;
  }

  await editReply(
    interaction,
    { embeds: [mmrLeaderboard(mapConfigName, board) as any] },
    msgDeleteTimeout.info
  );
};
