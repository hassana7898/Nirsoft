import { runCalculationsTests } from './unit/calculations.test.ts';
import { runAuthUnitTests } from './unit/auth.test.ts';
import { runDbIntegrationTests } from './integration/db.test.ts';
import { runAuthIntegrationTests } from './integration/auth-api.test.ts';

async function main() {
  console.log('====================================================');
  console.log('🧪 NIRWARE NEXT — Foundation Automated Test Suite');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  async function executeGroup(groupTitle: string, runner: () => Promise<{ name: string; passed: boolean; error?: string }[]>) {
    console.log(`▶ Running ${groupTitle}...`);
    const results = await runner();
    for (const r of results) {
      totalTests++;
      if (r.passed) {
        passedTests++;
        console.log(`  ✅ PASS: ${r.name}`);
      } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${r.name}`);
        console.error(`     Error: ${r.error}`);
      }
    }
    console.log('');
  }

  try {
    await executeGroup('Unit Tests: Industrial Calculations (FCR, Quota, BOM, Wastage)', runCalculationsTests);
    await executeGroup('Unit Tests: Password Hashing & Token Generation', runAuthUnitTests);
    await executeGroup('Integration Tests: PostgreSQL Schema, DDL & Transactions', runDbIntegrationTests);
    await executeGroup('Integration Tests: Authentication & Session Lifecycle', runAuthIntegrationTests);

    console.log('====================================================');
    console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      console.log('✨ ALL PHASE 2 FOUNDATION TESTS PASSED CLEANLY!\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal crash during test execution:', err);
    process.exit(1);
  }
}

main();
