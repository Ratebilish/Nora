import { ButtonBuilder, ButtonStyle } from "discord.js";
import { buttonId } from "../../utils/globals";

export type ShowConfigSelectorButtonProps = {
  label?: string;
  style?: ButtonStyle;
  disabled?: boolean;
};

export const showConfigSelectorButtonDefault = ({
  label,
  style,
  disabled,
}: ShowConfigSelectorButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.showConfigSelector)
    .setLabel(label || "Show config loader")
    .setStyle(style || ButtonStyle.Primary)
    .setDisabled(disabled || false);
};

export const showConfigSelectorButtonLoading = ({
  label,
  style,
  disabled,
}: ShowConfigSelectorButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.showConfigSelector)
    .setLabel(label || "Loading...")
    .setStyle(style || ButtonStyle.Secondary)
    .setDisabled(disabled || true);
};

export const showConfigSelectorButtonSuccess = ({
  label,
  style,
  disabled,
}: ShowConfigSelectorButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.showConfigSelector)
    .setLabel(label || "Config loaded")
    .setStyle(style || ButtonStyle.Success)
    .setDisabled(disabled || true);
};

export const showConfigSelectorButtonError = ({
  label,
  style,
  disabled,
}: ShowConfigSelectorButtonProps = {}) => {
  return new ButtonBuilder()
    .setCustomId(buttonId.showConfigSelector)
    .setLabel(label || "Network error")
    .setStyle(style || ButtonStyle.Danger)
    .setDisabled(disabled || true);
};
