import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Cumple TA3.2 del SDD-App-Web-Campeonato.md:
//   - dialect mysql
//   - dbCredentials.url tomada de DATABASE_URL_ADMIN
//   - out en ./src/db/pulled (se copia a schema.ts a mano; TA3.4)
//
// A2 (la base manda): solo se permite `pull`. NUNCA ejecutar
// `drizzle-kit push`, `generate` o `migrate` contra campeonato_futbol.
export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './src/db/pulled',
  dbCredentials: {
    url: process.env.DATABASE_URL_ADMIN ?? '',
  },
});
