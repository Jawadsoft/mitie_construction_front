/**
 * Rebuild / reindex all voucher-linked general journals from source documents.
 *
 * Usage (from backend/server):
 *   npm run rebuild:vouchers
 *   npm run rebuild:vouchers:apply
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AccountingService } from '../src/accounting/accounting.service';

async function main() {
  const apply = process.argv.includes('--apply');
  // eslint-disable-next-line no-console
  console.log(apply ? 'MODE: APPLY' : 'MODE: DRY-RUN (pass --apply to write)');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const accounting = app.get(AccountingService);
    const report = await accounting.rebuildAllVoucherJournals({ apply });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    if (report.errors?.length) {
      process.exitCode = 2;
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
