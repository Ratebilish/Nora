import { ChatInputCommandInteraction } from "discord.js";
import { warning } from "../../../embeds/response";
import { groupsKey, redisKey } from "../../../redis/kies";
import { redis } from "../../../redis/redis";
import { editReply } from "../../../utils/discordMessage";
import { msgDeleteTimeout } from "../../../utils/globals";
import { log } from "../../../utils/log";
import { getWinStats } from "../../../utils/mmdStats";
import { getDiscordUsersFromNicknames } from "../../../utils/nicknameToDiscordUser";
import { sendWinrateInteractiveEmbed } from "../../stats/sendWinrateInteractiveEmbed";

export const winrate = async (interaction: ChatInputCommandInteraction) => {
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

  const stats = await getWinStats(nickname);

  if (!stats) {
    await editReply(
      interaction,
      {
        embeds: [warning("No games for this nicknames") as any],
      },
      msgDeleteTimeout.default
    );
    return;
  }

  const member = await getDiscordUsersFromNicknames(
    [nickname],
    interaction.guildId
  );

  try {
    await sendWinrateInteractiveEmbed(
      interaction,
      stats,
      member[0] &&
        member[0].user.avatarURL({ size: 512, extension: "png" })
    );
  } catch (err) {
    log("[winrate] embed error");
  }
};
