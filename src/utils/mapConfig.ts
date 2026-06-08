import { groupsKey, redisKey } from "../redis/kies";
import { redis } from "../redis/redis";
import { defaultFbtMapConfig, defaultMapConfigName } from "./globals";
import { log } from "./log";

export const defaultOptions = {
  ranking: false,
  spectatorLivesMatter: false,
} as mapConfigOption;

export const searchMapConfigByMapName = async (
  mapName: string,
  guildID: string
) => {
  const configs = await getGuildMapConfigs(guildID);
  const config = configs.find((cfg) =>
    mapName.match(new RegExp(cfg.name, "i"))
  );
  return config;
};

export const searchMapConfigByName = async (
  configName: string,
  guildID: string
) => {
  const configs = await getGuildMapConfigs(guildID);
  const config = configs.find((cfg) => cfg.name === configName);
  return config;
};

export const getGuildMapConfigs = async (
  guildID: string
): Promise<Array<mapConfig>> => {
  const key = redisKey.struct(groupsKey.mapConfig, [guildID]);
  const results = await redis.get(key);
  return results ? results : [];
};

export const createOrUpdateMapConfig = async (
  guildID: string,
  newConfig: mapConfig
) => {
  const guildConfigs = await getGuildMapConfigs(guildID);
  const configIndex = guildConfigs.findIndex(
    (cfg) => cfg.name === newConfig.name
  );
  const key = redisKey.struct(groupsKey.mapConfig, [guildID]);
  if (configIndex === -1) {
    await redis.set(key, [
      ...guildConfigs,
      {
        ...newConfig,
        options: { ...defaultOptions, ...newConfig.options },
      },
    ]);
    return true;
  }
  const existing = guildConfigs[configIndex];
  guildConfigs.splice(configIndex, 1, {
    ...existing,
    ...newConfig,
    options: { ...defaultOptions, ...existing.options, ...newConfig.options },
  });
  await redis.set(key, guildConfigs);
  return false;
};

export const updateMapConfigOptions = async (
  guildID: string,
  configName: string,
  configOption: {
    fieldName: string;
    value: any;
  }
) => {
  const guildConfigs = await getGuildMapConfigs(guildID);
  const configIndex = guildConfigs.findIndex((cfg) => cfg.name === configName);

  if (configIndex === -1) return false;

  const key = redisKey.struct(groupsKey.mapConfig, [guildID]);
  guildConfigs[configIndex].options[configOption.fieldName] =
    configOption.value;

  await redis.set(key, guildConfigs);
  return true;
};

export const ensureDefaultMapConfig = async (
  guildID: string
): Promise<"created" | "renamed" | "exists" | "failed"> => {
  const renamed = await renameMapConfig(guildID, "fbtre", defaultMapConfigName);

  const existing = await searchMapConfigByName(defaultMapConfigName, guildID);
  if (existing) {
    return renamed ? "renamed" : "exists";
  }

  const isNew = await createOrUpdateMapConfig(
    guildID,
    defaultFbtMapConfig(guildID)
  );

  const created = await searchMapConfigByName(defaultMapConfigName, guildID);
  if (!isNew || !created) {
    log("[map config] failed to create default config");
    return "failed";
  }

  return "created";
};

export const renameMapConfig = async (
  guildID: string,
  oldName: string,
  newName: string
): Promise<boolean> => {
  const guildConfigs = await getGuildMapConfigs(guildID);
  const oldIndex = guildConfigs.findIndex((cfg) => cfg.name === oldName);

  if (oldIndex === -1) return false;

  const newIndex = guildConfigs.findIndex((cfg) => cfg.name === newName);
  const key = redisKey.struct(groupsKey.mapConfig, [guildID]);

  if (newIndex !== -1) {
    guildConfigs.splice(oldIndex, 1);
  } else {
    guildConfigs[oldIndex] = { ...guildConfigs[oldIndex], name: newName };
  }

  await redis.set(key, guildConfigs);
  return true;
};

export const deleteMapConfig = async (guildID: string, configName: string) => {
  const guildConfigs = await getGuildMapConfigs(guildID);
  const configIndex = guildConfigs.findIndex((cfg) => cfg.name === configName);

  if (configIndex === -1) return false;

  const key = redisKey.struct(groupsKey.mapConfig, [guildID]);
  guildConfigs.splice(configIndex, 1);
  await redis.set(key, guildConfigs);
  return true;
};
