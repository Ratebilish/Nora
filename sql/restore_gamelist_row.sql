-- Восстанавливает недостающую строку в gamelist для бота с botid = 2
-- (замените 2 на реальный BOT_ID, если он у вас задан явно в конфигурации)

INSERT INTO gamelist (botid, gamename, ownername, creatorname, map, slotstaken, slotstotal, usernames, totalgames, totalplayers)
VALUES (2, '', '', '', '', 0, 0, '', 0, 0);
