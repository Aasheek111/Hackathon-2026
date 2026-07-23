import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaLibSQL } = await import('@prisma/adapter-libsql');
      // For PostgreSQL via standard connection string, use the default adapter
      return undefined as any;
    },
  },
});
