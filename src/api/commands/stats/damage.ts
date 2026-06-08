import { ChatInputCommandInteraction } from "discord.js";
import { warning } from "../../../embeds/response";
import { leaderboardDamage } from "../../../embeds/stats";
import { editReply } from "../../../utils/discordMessage";
import { msgDeleteTimeout } from "../../../utils/globals";
import { getLeaderBordByDamage } from "../../../utils/mmdStats";

export const damage = async (interaction: ChatInputCommandInteraction) => {
  const damageStats = await getLeaderBordByDamage();

  if (!damageStats) {
    await editReply(
      interaction,
      { embeds: [warning("No players for stats") as any] },
      msgDeleteTimeout.default
    );
    return;
  }

  await editReply(
    interaction,
    { embeds: [leaderboardDamage(damageStats) as any] },
    msgDeleteTimeout.info
  );
};
