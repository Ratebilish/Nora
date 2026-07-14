-- Таблица рейтинга (MMR) игроков, отдельного для каждого конфига карты.
-- Прогнать один раз вручную на вашей MySQL БД перед использованием MMR-системы:
--   mysql -u <user> -p <database> < sql/migrations/001_create_player_mmr.sql

CREATE TABLE IF NOT EXISTS player_mmr (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guildID VARCHAR(64) NOT NULL,
  mapConfigName VARCHAR(128) NOT NULL,
  nickname VARCHAR(128) NOT NULL,
  mmr INT NOT NULL DEFAULT 1500,
  gamesPlayed INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_player_map (guildID, mapConfigName, nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
