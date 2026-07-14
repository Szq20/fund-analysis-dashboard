import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dashboardPath = path.join(serviceRoot, 'public', 'index.html');
const funds = [
  ['017436','华宝纳斯达克精选'],['006555','浦银安盛全球智能科技'],['270023','广发全球精选'],['017730','嘉实全球产业升级'],['000043','嘉实美国成长'],
  ['161128','易方达标普信息科技'],['012920','易方达全球成长精选'],['006373','国富全球科技'],['539002','建信新兴市场混合'],['001668','汇添富全球移动互联'],
  ['005698','华夏全球科技先锋'],['002891','华夏移动互联'],['016701','银华海外数字经济'],['501226','长城全球新能源车'],['017144','华宝海外新能源汽车'],
  ['501312','华宝海外科技'],['008253','华宝致远混合'],['017091','景顺长城纳斯达克科技'],['016664','天弘全球高端制造'],['100055','富国全球科技互联网']
];

const isoDate = date => date.toISOString().slice(0, 10);
const endDate = isoDate(new Date());
const startDate = '2024-09-24';
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
const oneYearStart = isoDate(oneYearAgo);

async function fetchFund(code, name) {
  const entries = [];
  for (let page = 1; page <= 40; page++) {
    const url = new URL('https://api.fund.eastmoney.com/f10/lsjz');
    Object.entries({fundCode: code, pageIndex: page, pageSize: 20, startDate, endDate})
      .forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, {
      headers: {Referer: 'https://fundf10.eastmoney.com/'},
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`${code} returned HTTP ${response.status}`);
    const json = await response.json();
    const list = json.Data?.LSJZList || [];
    entries.push(...list);
    const total = Number(json.TotalCount || json.Data?.TotalCount || 0);
    if (list.length < 20 || (total && entries.length >= total)) break;
  }
  const points = entries
    .map(item => [item.FSRQ, Number(item.DWJZ)])
    .filter(item => item[0] >= startDate && item[0] <= endDate && Number.isFinite(item[1]))
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (points.length < 2) throw new Error(`${code} ${name} has insufficient NAV history`);
  return {code, name, points};
}

const settled = await Promise.allSettled(funds.map(([code, name]) => fetchFund(code, name)));
const failures = settled.filter(result => result.status === 'rejected');
if (failures.length) {
  throw new Error(`Update aborted; ${failures.length} fund(s) failed: ${failures.map(x => x.reason.message).join('; ')}`);
}

const data = settled.map(result => result.value);
let html = await fs.readFile(dashboardPath, 'utf8');
if (!/const raw=\[.*?\];/s.test(html)) throw new Error('Embedded dashboard data marker not found');
const encodedData = JSON.stringify(data)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
html = html.replace(/const raw=\[.*?\];/s, `const raw=${encodedData};`);
html = html.replace(
  /const periods=\{.*?\};/s,
  `const periods={all:['${startDate}','${endDate}'],year:['${oneYearStart}','${endDate}'],y2025:['2025-01-01','2025-12-31'],y2026:['2026-01-01','${endDate}']};`
);
const temporaryPath = `${dashboardPath}.tmp`;
await fs.writeFile(temporaryPath, html, 'utf8');
await fs.rename(temporaryPath, dashboardPath);
console.log(`Updated ${data.length} funds through ${endDate}`);
