import { ButtonBuilder, ButtonStyle } from "discord.js";
import { buttonId } from "../../utils/globals";

export type UnhostGameButtonProps = {
  label?: string;
  style?: ButtonStyle;
  disabled?: boolean;
};

export const unhostGameButtonDefault = ({
  label,
  style,
  disabled,
}: UnhostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.unhostGame)
    .setLabel(label || "Unhost game")
    .setStyle(style || ButtonStyle.Danger)
    .setDisabled(disabled || false);
};

export const unhostGameButtonLoading = ({
  label,
  style,
  disabled,
}: UnhostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.unhostGame)
    .setLabel(label || "Loading...")
    .setStyle(style || ButtonStyle.Secondary)
    .setDisabled(disabled || true);
};

export const unhostGameButtonSuccess = ({
  label,
  style,
  disabled,
}: UnhostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.unhostGame)
    .setLabel(label || "Game unhosted")
    .setStyle(style || ButtonStyle.Success)
    .setDisabled(disabled || true);
};

export const unhostGameButtonError = ({
  label,
  style,
  disabled,
}: UnhostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.unhostGame)
    .setLabel(label || "Network error")
    .setStyle(style || ButtonStyle.Danger)
    .setDisabled(disabled || true);
};
