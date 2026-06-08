import { createClient } from "redis";
import { redisConnection } from "../auth.json";
import { log } from "../utils/log";

// redis v5: createClient принимает { url } или { socket: { host, port } }
const redisUrl =
  typeof redisConnection === "string"
    ? redisConnection
    : typeof redisConnection === "object" && redisConnection !== null
    ? `redis://${(redisConnection as any).host || "127.0.0.1"}:${
        (redisConnection as any).port || 6379
      }`
    : "redis://127.0.0.1:6379";

const client = createClient({ url: redisUrl });

client.on("error", (error) => {
  log("[redis]", error);
});

client.on("reconnecting", () => {});

// redis v5: необходим явный вызов connect()
client.connect().catch((err) => {
  log("[redis] connection failed", err);
});

export const redis = {
  get: async (key: string) => {
    try {
      const raw = await client.get(key);
      if (raw === null) return null;
      // redis v5: get() может вернуть Buffer, приводим к string
      return JSON.parse(raw.toString());
    } catch (error) {
      log("[redis] cant get item");
      return undefined;
    }
  },
  set: async (key: string, data: any) => {
    try {
      return await client.set(key, JSON.stringify(data));
    } catch (error) {
      log("[redis] cant set item");
      return undefined;
    }
  },
  mget: async (keys: string[]) => {
    try {
      const results = await client.mGet(keys);
      return results.map((item) =>
        item ? JSON.parse(item.toString()) : null
      );
    } catch (error) {
      log("[redis] cant mget items");
      return [];
    }
  },
  del: async (key: string | string[]) => {
    try {
      if (Array.isArray(key)) {
        return await client.del(key);
      }
      return await client.del(key);
    } catch (error) {
      log("[redis] cant delete item");
      return undefined;
    }
  },
  exist: async (key: string) => {
    try {
      return await client.exists(key);
    } catch (error) {
      log("[redis] cant check exists");
      return 0;
    }
  },
  scanForPattern: async (pattern: string): Promise<Array<string> | null> => {
    const found: string[] = [];
    try {
      // redis v5: SCAN через итератор, key может быть Buffer
      for await (const key of client.scanIterator({ MATCH: pattern })) {
        found.push(key.toString());
      }
      return found.length ? found : null;
    } catch (error) {
      log("[redis] scan error", error);
      return null;
    }
  },
};
