import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  console.log('Database schema synchronized (TypeORM synchronize: true).');
  console.log('Default roles and admin user seeded on first run if missing.');

  await app.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
