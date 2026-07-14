import { ButtonBuilder, ButtonStyle } from "discord.js";
import { buttonId } from "../../utils/globals";

export type ShuffleWinrateButtonProps = {
  botid: number;
  label?: string;
  style?: ButtonStyle;
  disabled?: boolean;
};

export const shuffleWinrateButtonId = (botid: number) =>
  `${buttonId.shuffleWinrate}:${botid}`;

export const shuffleWinrateButtonDefault = ({
  botid,
  label,
  style,
  disabled,
}: ShuffleWinrateButtonProps) => {
  return new ButtonBuilder()
    .setCustomId(shuffleWinrateButtonId(botid))
    .setLabel(label || "Balance MMR")
    .setStyle(style || ButtonStyle.Secondary)
    .setDisabled(disabled || false);
};

export const shuffleWinrateButtonLoading = ({
  botid,
  label,
  style,
  disabled,
}: ShuffleWinrateButtonProps) => {
  return new ButtonBuilder()
    .setCustomId(shuffleWinrateButtonId(botid))
    .setLabel(label || "Balancing...")
    .setStyle(style || ButtonStyle.Secondary)
    .setDisabled(disabled ?? true);
};

export const shuffleWinrateButtonSuccess = ({
  botid,
  label,
  style,
  disabled,
}: ShuffleWinrateButtonProps) => {
  return new ButtonBuilder()
    .setCustomId(shuffleWinrateButtonId(botid))
    .setLabel(label || "Balanced")
    .setStyle(style || ButtonStyle.Success)
    .setDisabled(disabled ?? true);
};

export const shuffleWinrateButtonError = ({
  botid,
  label,
  style,
  disabled,
}: ShuffleWinrateButtonProps) => {
  return new ButtonBuilder()
    .setCustomId(shuffleWinrateButtonId(botid))
    .setLabel(label || "Balance failed")
    .setStyle(style || ButtonStyle.Danger)
    .setDisabled(disabled ?? true);
};
