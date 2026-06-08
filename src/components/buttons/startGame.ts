import { ButtonBuilder, ButtonStyle } from "discord.js";
import { buttonId } from "../../utils/globals";

export type StartGameButtonProps = {
  label?: string;
  style?: ButtonStyle;
  disabled?: boolean;
};

export const startGameButtonDefault = ({
  label,
  style,
  disabled,
}: StartGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.startGame)
    .setLabel(label || "Start game")
    .setStyle(style || ButtonStyle.Primary)
    .setDisabled(disabled || false);
};

export const startGameButtonLoading = ({
  label,
  style,
  disabled,
}: StartGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.startGame)
    .setLabel(label || "Loading...")
    .setStyle(style || ButtonStyle.Secondary)
    .setDisabled(disabled || true);
};

export const startGameButtonSuccess = ({
  label,
  style,
  disabled,
}: StartGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.startGame)
    .setLabel(label || "Game started")
    .setStyle(style || ButtonStyle.Success)
    .setDisabled(disabled || true);
};

export const startGameButtonError = ({
  label,
  style,
  disabled,
}: StartGameButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.startGame)
    .setLabel(label || "Network error")
    .setStyle(style || ButtonStyle.Danger)
    .setDisabled(disabled || true);
};
