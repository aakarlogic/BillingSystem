// Lists text keys used in src/ that a language file does not have.
// Run: npx vite-node scripts/check-i18n.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import en from '../src/utils/languages/en';
import enApp from '../src/utils/languages/en-app';
import hi from '../src/utils/languages/hi';
import hiApp from '../src/utils/languages/hi-app';
import mr from '../src/utils/languages/mr';
import mrApp from '../src/utils/languages/mr-app';
import { mergeDictionaries } from '../src/utils/i18n';
import type { Dictionary, Entry } from '../src/utils/languages/types';

// keys built from codes at runtime: expand them here
const DYNAMIC: Record<string, string[]> = {
  'statusCode.': ['OPEN', 'BILLED', 'PART_PAID', 'PAID', 'CANCELLED', 'REFUNDED', 'ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE', 'AVAILABLE', 'OCCUPIED', 'BILL_PENDING'],
  'roleCode.': ['SUPER_ADMIN', 'OWNER', 'STAFF'],
  'roleHelp.': ['SUPER_ADMIN', 'OWNER', 'STAFF'],
  'platform.type.': ['RESTAURANT', 'CAFE', 'SHOP', 'SERVICE'],
  'reports.preset.': ['today', 'yesterday', 'week', 'month', 'd30'],
  'bills.tab.': ['ALL', 'OPEN', 'UNPAID', 'PAID', 'CANCELLED'],
};
const PERMS = ['ORDERS_TAKE', 'PAYMENTS_TAKE', 'DISCOUNTS_GIVE', 'BILLS_CANCEL', 'SALES_VIEW'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

const keys = new Set<string>();
for (const f of files('src')) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt[l]?(?:<[^>]*>)?\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
  for (const m of src.matchAll(/labelKey: '([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
  for (const m of src.matchAll(/noteKey: '([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
  for (const m of src.matchAll(/`landing\.\$\{k\}`/g)) void m;
  for (const m of src.matchAll(/\bL\('([a-zA-Z0-9_.]+)'/g)) keys.add(`landing.${m[1]}`);
  for (const m of src.matchAll(/\bg\('([a-zA-Z0-9_.]+)'/g)) keys.add(`guide.${m[1]}`);
}
for (const [prefix, codes] of Object.entries(DYNAMIC)) codes.forEach((c) => keys.add(prefix + c));
PERMS.forEach((p) => ['label', 'hint', 'short'].forEach((x) => keys.add(`perm.${p}.${x}`)));

const has = (d: Dictionary, key: string) => {
  let node: Entry | undefined = d;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && !Array.isArray(node)) node = node[part];
    else return false;
  }
  return node !== undefined;
};

let missing = 0;
const all: [string, Dictionary][] = [
  ['en', mergeDictionaries(en as Dictionary, enApp)],
  ['hi', mergeDictionaries(hi, hiApp)],
  ['mr', mergeDictionaries(mr, mrApp)],
];
for (const [name, dict] of all) {
  const miss = [...keys].filter((k) => !has(dict, k)).sort();
  missing += miss.length;
  console.log(`${name}: ${miss.length} missing`);
  if (miss.length) console.log('  ' + miss.join('\n  '));
}
console.log(`${keys.size} keys checked`);
process.exitCode = missing ? 1 : 0;
