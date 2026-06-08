import { ButtonBuilder, ButtonStyle } from "discord.js";
import { buttonId } from "../../utils/globals";

export type HostGameButtonProps = {
  label?: string;
  style?: ButtonStyle;
  disabled?: boolean;
};

export const hostGameButtonDefault = ({
  label,
  style,
  disabled,
}: HostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.hostGame)
    .setLabel(label || "Host game")
    .setStyle(style || ButtonStyle.Primary)
    .setDisabled(disabled || false);
};

export const hostGameButtonLoading = ({
  label,
  style,
  disabled,
}: HostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.hostGame)
    .setLabel(label || "Loading...")
    .setStyle(style || ButtonStyle.Secondary)
    .setDisabled(disabled || true);
};

export const hostGameButtonSuccess = ({
  label,
  style,
  disabled,
}: HostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.hostGame)
    .setLabel(label || "Game hosted")
    .setStyle(style || ButtonStyle.Success)
    .setDisabled(disabled || true);
};

export const hostGameButtonError = ({
  label,
  style,
  disabled,
}: HostGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.hostGame)
    .setLabel(label || "Network error")
    .setStyle(style || ButtonStyle.Danger)
    .setDisabled(disabled || true);
};
