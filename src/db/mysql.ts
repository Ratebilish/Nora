import mysql from "mysql2/promise";
import { dbConnection } from "../auth.json";
import { log } from "../utils/log";

const pool = mysql.createPool({
  host: (dbConnection as any).host || "localhost",
  user: (dbConnection as any).user || "root",
  password: (dbConnection as any).password || "",
  database: (dbConnection as any).database || "ghost",
  port: (dbConnection as any).port || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

pool
  .getConnection()
  .then((conn) => {
    log("[mysql] connected to", (dbConnection as any).database);
    conn.release();
  })
  .catch((err) => {
    log("[mysql] connection error", err);
  });

export const makeQuery = async (query: string) => {
  try {
    const [rows] = await pool.query(query);
    const result = rows as any[];
    if (!result || !Array.isArray(result) || !result.length) return null;
    return result;
  } catch (error) {
    log("[mysql]", error);
    return null;
  }
};

/**
 * Для DDL-запросов (CREATE TABLE и т.п.), где нет смысла интерпретировать
 * результат как массив строк — makeQuery в этом случае вернул бы null
 * даже при успешном выполнении.
 */
export const execRaw = async (query: string): Promise<boolean> => {
  try {
    await pool.query(query);
    return true;
  } catch (error) {
    log("[mysql]", error);
    return false;
  }
};
