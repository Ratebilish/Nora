import { ChatInputCommandInteraction } from "discord.js";
import { getHeroStatsForPlayer } from "../../../db/queries";
import { heroStatsSummary } from "../../../embeds/heroStats";
import { warning } from "../../../embeds/response";
import { groupsKey, redisKey } from "../../../redis/kies";
import { redis } from "../../../redis/redis";
import { editReply } from "../../../utils/discordMessage";
import { msgDeleteTimeout } from "../../../utils/globals";

export const summary = async (interaction: ChatInputCommandInteraction) => {
  const key = redisKey.struct(groupsKey.bindNickname, [
    interaction.guildId,
    interaction.user.id,
  ]);
  const user = (await redis.get(key)) as userData;
  const nickname =
    interaction.options.getString("nickname") || (user && user.nickname);

  if (!nickname) {
    await editReply(
      interaction,
      { embeds: [warning("No nickname") as any] },
      msgDeleteTimeout.default
    );
    return;
  }

  const heroStats = await getHeroStatsForPlayer(nickname);

  if (!heroStats || heroStats.length === 0) {
    await editReply(
      interaction,
      {
        embeds: [warning(`No hero statistics found for ${nickname}`) as any],
      },
      msgDeleteTimeout.long
    );
    return;
  }

  await editReply(
    interaction,
    { embeds: [heroStatsSummary(nickname, heroStats) as any] },
    msgDeleteTimeout.info
  );
};
