import {
  ButtonBuilder,
  ComponentType,
  Message,
  StringSelectMenuBuilder,
} from "discord.js";

/**
 * discord.js v14.25+: message.resolveComponent() удалён.
 * message.components теперь TopLevelComponent[] (включая FileComponent от v2).
 * Фильтруем только ActionRow перед обращением к .components.
 */

export const resolveButton = (
  message: Message,
  customId: string
): ButtonBuilder | null => {
  if (!message.components || !Array.isArray(message.components)) return null;
  for (const row of message.components) {
    if (!("components" in row)) continue;
    for (const component of row.components) {
      if (
        component.type === ComponentType.Button &&
        component.customId === customId
      ) {
        return ButtonBuilder.from(component);
      }
    }
  }
  return null;
};

export const resolveSelectMenu = (
  message: Message,
  customId: string
): StringSelectMenuBuilder | null => {
  if (!message.components || !Array.isArray(message.components)) return null;
  for (const row of message.components) {
    if (!("components" in row)) continue;
    for (const component of row.components) {
      if (
        component.type === ComponentType.StringSelect &&
        component.customId === customId
      ) {
        return StringSelectMenuBuilder.from(component);
      }
    }
  }
  return null;
};
