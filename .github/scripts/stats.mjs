// Refreshes the ChapterPrep numbers in README.md from chapterprep.com's public stats.
// Each number sits between <!--stat:name--> and <!--/stat-->, rounded DOWN ("2,800+"), so it never
// overstates. If the fetch fails or a value looks wrong, the README is left as it is.
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'https://chapterprep.com/api/public-stats';
const file = new URL('../../README.md', import.meta.url);

const plus = (n) => {
  const step = n >= 100000 ? 10000 : n >= 10000 ? 1000 : n >= 1000 ? 100 : n >= 100 ? 10 : 1;
  return `${(Math.floor(n / step) * step).toLocaleString('en-US')}+`;
};

const res = await fetch(SOURCE, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
if (!res.ok) {
  console.log(`source answered ${res.status}; README unchanged`);
  process.exit(0);
}
const json = await res.json();
const r = json?.stats ?? json?.data ?? json;
const users = [r.users, r.accounts, r.studentsAndAdvisors, r.members].find((v) => typeof v === 'number' && v >= 1000 && v < 5e6);
if (users === undefined) {
  console.log('no plausible user count; README unchanged');
  process.exit(0);
}
// all of Rookhouse's own products: ChapterPrep live + Lark (170) and Corvo (33) as counted Nov 19 2026, which only grow
const values = { users: plus(users), allUsers: plus(users + 200) };

const before = readFileSync(file, 'utf8');
const after = before.replace(/<!--stat:(\w+)-->[^<]*<!--\/stat-->/g, (m, k) =>
  values[k] ? `<!--stat:${k}-->${values[k]}<!--/stat-->` : m,
);
if (after !== before) {
  writeFileSync(file, after);
  console.log('README updated', values);
} else console.log('no change', values);
