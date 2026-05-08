import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
    shadowDatabaseUrl: "postgresql://postgres:postgres@localhost:5432/postgres_shadow",
  },
});
