import { ChatInputCommandInteraction } from "discord.js";
import { getLatestGameId } from "../../../db/queries";
import { warning } from "../../../embeds/response";
import { editReply } from "../../../utils/discordMessage";
import { sendTestGameResult } from "../../../utils/gamestatsUtils";
import { msgDeleteTimeout } from "../../../utils/globals";

export const test = async (interaction: ChatInputCommandInteraction) => {
  const gameID = await getLatestGameId();

  if (!gameID) {
    await editReply(
      interaction,
      { embeds: [warning("No games found in the database") as any] },
      msgDeleteTimeout.default
    );
    return;
  }

  const result = await sendTestGameResult(
    gameID,
    interaction.channelId,
    interaction.guildId
  );

  switch (result) {
    case "sent":
      await editReply(
        interaction,
        { content: `Test summary sent for game #${gameID}.` },
        msgDeleteTimeout.short
      );
      return;
    case "not_two_teams":
      await editReply(
        interaction,
        {
          embeds: [
            warning(
              `Game #${gameID} is not a 2-team game, nothing to show`
            ) as any,
          ],
        },
        msgDeleteTimeout.default
      );
      return;
    case "no_game":
    default:
      await editReply(
        interaction,
        {
          embeds: [warning(`Could not load data for game #${gameID}`) as any],
        },
        msgDeleteTimeout.default
      );
      return;
  }
};
