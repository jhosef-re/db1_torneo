-- ============================================================================
-- 05_usuario_app.sql
-- Usuario de solo lectura para la app web del Campeonato.
-- SDD-App-Web-Campeonato.md · Fase A1 · Tareas TA1.1 / TA1.2 / TA1.3.
--
-- Cumple:
--   A1  (app de solo lectura)
--   A2  (la base manda)
--   A5  (credenciales fuera del repo)
--
-- REQUISITOS:
--   - Ejecutar con un usuario que tenga CREATE USER / GRANT (por ejemplo, root).
--   - MySQL 8.0.16+ (mismo mínimo que el SDD base).
--
-- La contraseña NO se hardcodea aquí. Se pasa por variable de sesión:
--   mysql -u root -p < 05_usuario_app.sql
-- y luego, en una segunda sesión, se asigna con:
--   ALTER USER 'app_campeonato'@'127.0.0.1' IDENTIFIED BY '<tu-clave>';
-- (cambia <tu-clave> por una que solo tú conozcas).
--
-- Si prefieres un solo paso, sustituye '<tu-clave>' por tu contraseña real
-- antes de ejecutar el archivo.
-- ============================================================================

-- 1. Crear el usuario dedicado a la app (origen restringido a 127.0.0.1)
CREATE USER IF NOT EXISTS 'app_campeonato'@'127.0.0.1'
  IDENTIFIED BY '<tu-clave>';

-- 2. Conceder ÚNICAMENTE SELECT sobre las tablas de la base
GRANT SELECT
  ON campeonato_futbol.*
  TO 'app_campeonato'@'127.0.0.1';

-- 3. Refrescar privilegios
FLUSH PRIVILEGES;
