import { ButtonBuilder, ButtonStyle } from "discord.js";
import { buttonId } from "../../utils/globals";

export type RefreshWatcherButtonProps = {
  label?: string;
  style?: ButtonStyle;
  disabled?: boolean;
};

export const refreshWatcherButtonDefault = ({
  label,
  style,
  disabled,
}: RefreshWatcherButtonProps = {}) => {
  const btn = new ButtonBuilder()
    .setCustomId(buttonId.refreshWatcher)
    .setStyle(style || ButtonStyle.Secondary)
    .setEmoji("🔄")
    .setDisabled(disabled || false);
  if (label) btn.setLabel(label);
  return btn;
};
