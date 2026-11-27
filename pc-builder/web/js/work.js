import { el, icon } from './util.js';
import { WORK_BENCHMARKS, benchmarkScore, benchmarkCpuKey } from './work-data.js';

function context(benchmark) {
  return benchmark.unit === 'median' ? benchmark.version : `${benchmark.version} · сравнение процессоров`;
}

function metricLabel(benchmark) {
  return el('div', el('b', benchmark.label), el('div.dim.small', `${context(benchmark)} · ${benchmark.reference} = 100`));
}

function scoreNode(score) {
  return el(score ? 'b' : 'span.dim', {
    title: score?.count ? `Замеров в Blender Open Data — ${score.count}` : '',
  }, score ? `≈ ${score.points}` : 'Нет замера');
}

function sourceDetails(rows) {
  const blender = rows.some(({ unit }) => unit === 'median');
  const puget = rows.some(({ unit }) => unit !== 'median');
  return el('details.small.work-sources', el('summary', 'Источники и условия'),
    blender ? el('p', 'Blender Open Data · данные на 27.11.2026. Медианы рендера Cycles под Windows, от пяти замеров на модель. Для видеокарт используются OptiX, HIP и oneAPI. Результат зависит от сцены, драйвера и объёма видеопамяти.') : null,
    puget ? el('p', 'Puget Systems сравнивает процессоры на стенде с RTX 4080 и 64 ГБ памяти. Для i9-14900K взят профиль теста 253 Вт. Итог в вашей сборке зависит от видеокарты, памяти, настроек и проекта. Балл компиляции рассчитан по времени сборки исходников Unreal Engine.') : null,
    el('ul.compact-list', rows.map((b) => el('li', `${b.label} — `, b.sources.map(([name, url], i) => [
      i ? ' · ' : '', el('a', { href: url, target: '_blank', rel: 'noopener' }, name),
    ])))));
}

export function renderWorkBenchmarks(parts, have) {
  if (!parts.cpu && !parts.gpu) return null;
  const cell = (benchmark) => {
    const item = parts[benchmark.component];
    if (item) return scoreNode(benchmarkScore(benchmark, item));
    if (benchmark.component === 'cpu') return el('span.dim', 'Укажите процессор');
    return el('span.dim', have?.gpu ? 'Укажите модель' : 'Без отдельной видеокарты');
  };
  const rows = WORK_BENCHMARKS.map((b) => el('tr', el('th', { scope: 'row' }, metricLabel(b)), el('td', cell(b))));
  return el('section.card.work-card',
    el('h3', icon('film'), ' Рабочие программы'),
    el('p.dim.small', 'Примерные баллы по замерам. В каждом тесте 100 — результат указанной эталонной модели.'),
    el('table.tbl', el('tbody', rows)),
    sourceDetails(WORK_BENCHMARKS));
}

export function compareWorkRows(partSets, makeRow) {
  const rows = WORK_BENCHMARKS.filter((benchmark) => partSets.some((parts) => parts[benchmark.component]));
  return {
    rows: rows.map((b) => makeRow(metricLabel(b), (_, index) => {
      const item = partSets[index][b.component];
      return item ? scoreNode(benchmarkScore(b, item)) : '—';
    })),
    sources: rows.length ? sourceDetails(rows) : null,
  };
}

export function workPartsOf(item) {
  if (item.category === 'videocard' || (!item.category && item.gpu)) return { gpu: item };
  if (item.category === 'cpu' || (!item.category && item.source === 'kufar' && benchmarkCpuKey(item.name))) return { cpu: item };
  return {};
}
