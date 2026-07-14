-- ВНИМАНИЕ: необратимо удаляет ВСЕ данные из ВСЕХ таблиц текущей базы,
-- но сохраняет структуру таблиц (сами таблицы не удаляются, auto_increment
-- сбрасывается на 0). Перед запуском рекомендуется сделать бэкап:
--   mysqldump -u <user> -p <database> > backup_before_wipe.sql
--
-- Запуск:
--   mysql -u <user> -p <database> < wipe_all_tables.sql

SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS truncate_all_tables;

DELIMITER $$

CREATE PROCEDURE truncate_all_tables()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE tbl_name VARCHAR(255);
  DECLARE cur CURSOR FOR
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = DATABASE();
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO tbl_name;
    IF done THEN
      LEAVE read_loop;
    END IF;

    SET @sql = CONCAT('TRUNCATE TABLE `', tbl_name, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;

  CLOSE cur;
END$$

DELIMITER ;

CALL truncate_all_tables();
DROP PROCEDURE truncate_all_tables;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'All tables truncated' AS result;
