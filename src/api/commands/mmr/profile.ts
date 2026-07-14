import { ChatInputCommandInteraction } from "discord.js";
import { getPlayerMmr } from "../../../db/queries";
import { mmrProfile } from "../../../embeds/mmr";
import { warning } from "../../../embeds/response";
import { groupsKey, redisKey } from "../../../redis/kies";
import { redis } from "../../../redis/redis";
import { editReply } from "../../../utils/discordMessage";
import { defaultMapConfigName, msgDeleteTimeout } from "../../../utils/globals";
import { searchMapConfigByName } from "../../../utils/mapConfig";

export const profile = async (interaction: ChatInputCommandInteraction) => {
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

  const mmrData = await getPlayerMmr(interaction.guildId, mapConfigName, nickname);

  await editReply(
    interaction,
    { embeds: [mmrProfile(nickname, mapConfigName, mmrData) as any] },
    msgDeleteTimeout.info
  );
};
