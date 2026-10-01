import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const festival = fs.readFileSync(new URL('../src/pages/Homepage/Component/Festival.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/pages/Homepage/Component/Services/Festival_template.jsx', import.meta.url), 'utf8');

test('Festival Home auto-loads today plus next five days together', () => {
  assert.match(festival, /HOME_FESTIVAL_DAYS\s*=\s*6/);
  assert.match(festival, /dates\.slice\(0,\s*HOME_FESTIVAL_DAYS\)/);
  assert.match(festival, /Promise\.allSettled/);
  assert.match(festival, /bypassEmptyCache:\s*iso\s*===\s*todayIso/);
  assert.match(festival, /setAllFestivalData\(\(prev\)\s*=>\s*\(\{\s*\.\.\.prev,\s*\.\.\.nextData\s*\}\)\)/s);
});

test('Festival dates after the first six remain click-to-fetch', () => {
  assert.match(festival, /ensureDateLoaded\(iso\)/);
  assert.match(festival, /if \(loadedDateRef\.current\.has\(iso\)\)/);
});

test('Festival service can force a live current-date read', () => {
  assert.match(service, /forceRefresh\s*=\s*false/);
  assert.match(service, /if \(!forceRefresh\s*&&\s*hit\s*!==\s*null/);
});
