import { Body, Controller, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Tables to delete in correct FK-safe order (with FK checks disabled)
// mode: 'transactions' → clears financial/operational records only
// mode: 'full'         → also clears projects, suppliers, customers, contractors, fund sources
const TRANSACTION_TABLES = [
  'journal_entry_lines',
  'journal_entries',
  'sale_installments',
  'sales',
  'material_issues',
  'stock_ledger',
  'material_receipts',
  'po_items',
  'purchase_orders',
  'labour_advances',
  'labour_payments',
  'labour_attendance',
  'expenses',
  'fund_transactions',
  'cash_transactions',
  'stage_progress',
  'stage_budgets',
];

const FULL_RESET_EXTRA_TABLES = [
  'property_units',
  'customers',
  'project_stages',
  'projects',
  'suppliers',
  'labour_contractors',
  'fund_sources',
  'accounts',
];

@Controller('api/settings')
export class SettingsController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Post('reset')
  async reset(@Body() body: { mode: 'transactions' | 'full'; confirm: string }) {
    if (body.confirm !== 'RESET') {
      return { success: false, message: 'Confirmation text must be "RESET".' };
    }
    if (!['transactions', 'full'].includes(body.mode)) {
      return { success: false, message: 'Invalid reset mode.' };
    }

    const tables =
      body.mode === 'full'
        ? [...TRANSACTION_TABLES, ...FULL_RESET_EXTRA_TABLES]
        : TRANSACTION_TABLES;

    const skipped: string[] = [];
    for (const table of tables) {
      try {
        // TRUNCATE ... RESTART IDENTITY resets sequences; CASCADE handles FK deps
        await this.dataSource.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      } catch {
        // Table may not exist — skip silently
        skipped.push(table);
      }
    }

    return {
      success: true,
      mode: body.mode,
      tablesCleared: tables.length - skipped.length,
      message:
        body.mode === 'full'
          ? 'Full reset complete. All data except users and material catalog has been cleared.'
          : 'Transaction reset complete. Financial and operational records have been cleared.',
    };
  }
}
