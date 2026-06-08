import { ChatInputCommandInteraction } from "discord.js";
import { create } from "../api/commands/mapconfig/create";
import { deleteCofnig } from "../api/commands/mapconfig/delete";
import { setranking } from "../api/commands/mapconfig/setranking";
import { show } from "../api/commands/mapconfig/show";
import mapconfigCommand from "../commandData/mapconfig";
import { ownerID, production } from "../utils/globals";

module.exports = {
  data: mapconfigCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!production && interaction.member.user.id !== ownerID) return;

    await interaction.deferReply();

    switch (interaction.options.getSubcommand()) {
      case "create":
        await create(interaction);
        return;
      case "show":
        await show(interaction);
        return;
      case "delete":
        await deleteCofnig(interaction);
        return;
      case "setranking":
        await setranking(interaction);
        return;
      default:
        return await interaction.editReply("...");
    }
  },
};
