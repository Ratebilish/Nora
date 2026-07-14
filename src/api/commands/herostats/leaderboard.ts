import { ChatInputCommandInteraction } from "discord.js";
import { getHeroLeaderboard } from "../../../db/queries";
import { heroLeaderboard } from "../../../embeds/heroStats";
import { warning } from "../../../embeds/response";
import { editReply } from "../../../utils/discordMessage";
import { msgDeleteTimeout } from "../../../utils/globals";

export const leaderboard = async (
  interaction: ChatInputCommandInteraction
) => {
  const heroBoard = await getHeroLeaderboard();

  if (!heroBoard || heroBoard.length === 0) {
    await editReply(
      interaction,
      { embeds: [warning("No hero leaderboard data available") as any] },
      msgDeleteTimeout.long
    );
    return;
  }

  await editReply(
    interaction,
    { embeds: [heroLeaderboard(heroBoard) as any] },
    msgDeleteTimeout.info
  );
};
