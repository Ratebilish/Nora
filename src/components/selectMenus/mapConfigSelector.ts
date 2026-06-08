import { StringSelectMenuBuilder } from "discord.js";
import { selectMenuId } from "../../utils/globals";

// discord.js v14: MessageSelectMenu → StringSelectMenuBuilder

export type MapConfigSelectorProps = {
  options: string[];
  defaultOption?: string;
  placeholder?: string;
  disabled?: boolean;
};

export const mapConfigSelectorDefault = ({
  options,
  defaultOption,
  placeholder,
  disabled,
}: MapConfigSelectorProps) => {
  return new StringSelectMenuBuilder()
    .setCustomId(selectMenuId.selectMapConfigWatcherHub)
    .setPlaceholder(placeholder || "Select map config")
    .setDisabled(disabled || false)
    .addOptions(
      options.map((option) => ({
        label: option,
        value: option,
        default: option === defaultOption,
      }))
    );
};

export const mapConfigSelectorLoading = ({
  options,
  defaultOption,
  placeholder,
  disabled,
}: MapConfigSelectorProps) => {
  return new StringSelectMenuBuilder()
    .setCustomId(selectMenuId.selectMapConfigWatcherHub)
    .setPlaceholder(placeholder || "Loading map...")
    .setDisabled(disabled || true)
    .addOptions(
      options.map((option) => ({
        label: option,
        value: option,
        default: option === defaultOption,
      }))
    );
};

export const mapConfigSelectorSuccess = ({
  options,
  defaultOption,
  placeholder,
  disabled,
}: MapConfigSelectorProps) => {
  return new StringSelectMenuBuilder()
    .setCustomId(selectMenuId.selectMapConfigWatcherHub)
    .setPlaceholder(placeholder || "Map loaded")
    .setDisabled(disabled || true)
    .addOptions(
      options.map((option) => ({
        label: option,
        value: option,
        default: option === defaultOption,
      }))
    );
};

export const mapConfigSelectorError = ({
  options,
  defaultOption,
  placeholder,
  disabled,
}: MapConfigSelectorProps) => {
  return new StringSelectMenuBuilder()
    .setCustomId(selectMenuId.selectMapConfigWatcherHub)
    .setPlaceholder(placeholder || "Network error")
    .setDisabled(disabled || true)
    .addOptions(
      options.map((option) => ({
        label: option,
        value: option,
        default: option === defaultOption,
      }))
    );
};
