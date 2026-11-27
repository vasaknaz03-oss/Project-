// Blender Open Data (CC0), сводка Blender 4.5.0 под Windows на 27.11.2026.
// Записи содержат медианный балл и число замеров. Включены точные настольные модели
// из perfdb с пятью или более замерами. У вариантов памяти нужен отдельный результат.
const blenderCpu = {
  i10100: [74.05, 8],
  i10400: [116.93, 16],
  i10400f: [112.99, 32],
  i10600k: [121.19, 5],
  i10600kf: [121.41, 5],
  i10700: [157.24, 44],
  i10700f: [159.41, 9],
  i10700k: [179.11, 31],
  i10900f: [167.35, 5],
  i10900k: [239.63, 27],
  i10900kf: [221.71, 8],
  i11400: [126.8, 8],
  i11400f: [122.59, 23],
  i11500: [141.49, 6],
  i11600k: [141.07, 6],
  i11700: [127.67, 13],
  i11700f: [155.61, 8],
  i11700k: [198.46, 18],
  i11900k: [227.09, 16],
  i11900kf: [178.8, 6],
  i12100: [91.99, 5],
  i12100f: [105.42, 10],
  i12400: [154.34, 28],
  i12400f: [154.23, 94],
  i12500: [152.97, 5],
  i12600k: [215.3, 35],
  i12600kf: [212.36, 18],
  i12700: [222.86, 25],
  i12700f: [227.27, 23],
  i12700k: [283.92, 111],
  i12700kf: [289.77, 95],
  i12900k: [347.87, 51],
  i12900kf: [346.04, 28],
  i12900ks: [371.11, 9],
  i13400: [187.21, 7],
  i13400f: [200.32, 71],
  i13500: [261.59, 20],
  i13600k: [302.18, 31],
  i13600kf: [295.84, 41],
  i13700: [362.25, 9],
  i13700f: [274.45, 13],
  i13700k: [382.91, 103],
  i13700kf: [359.62, 83],
  i13900: [319.73, 5],
  i13900k: [483.51, 68],
  i13900kf: [477.25, 46],
  i13900ks: [505.29, 11],
  i14400: [198.81, 10],
  i14400f: [202.4, 42],
  i14500: [212.46, 7],
  i14600k: [299.9, 93],
  i14600kf: [306.27, 72],
  i14700: [299.92, 38],
  i14700f: [294.65, 46],
  i14700k: [437.37, 84],
  i14700kf: [440.89, 115],
  i14900f: [298.73, 5],
  i14900k: [503.76, 249],
  i14900kf: [493.42, 63],
  i14900ks: [518.75, 28],
  i6500: [44.68, 10],
  i6700: [67.3, 20],
  i6700k: [79.74, 19],
  i7400: [46.01, 11],
  i7600k: [67.32, 18],
  i7700: [71.8, 24],
  i7700k: [86.16, 26],
  i8400: [77.39, 14],
  i8500: [77.24, 10],
  i8700: [114.77, 33],
  i8700k: [121.45, 35],
  i9100f: [52.44, 6],
  i9400: [83.9, 5],
  i9400f: [77.91, 23],
  i9600k: [101.22, 25],
  i9600kf: [84.72, 6],
  i9700: [107.11, 13],
  i9700f: [118.47, 16],
  i9700k: [134.53, 34],
  i9900k: [167.75, 52],
  r1600: [96.54, 9],
  r2600: [102.16, 40],
  r2600x: [105.33, 9],
  r2700x: [141.54, 31],
  r3200g: [45.1, 5],
  r3400g: [67.76, 10],
  r3500x: [84.66, 5],
  r3600: [125.38, 122],
  r3600x: [137.76, 21],
  r3700x: [169.87, 82],
  r3800x: [169.39, 15],
  r3900: [247.12, 6],
  r3900x: [261.41, 99],
  r3900xt: [270.99, 6],
  r3950x: [349.71, 43],
  r4500: [122.66, 18],
  r5500: [137.48, 71],
  r5500gt: [140.27, 6],
  r5500x3d: [144.45, 6],
  r5600: [149.03, 110],
  r5600g: [144.86, 151],
  r5600gt: [137.62, 14],
  r5600x: [144.98, 165],
  r5600xt: [150.68, 5],
  r5700: [186.97, 12],
  r5700g: [186.13, 44],
  r5700x: [190.28, 218],
  r5700x3d: [185.51, 54],
  r5800x: [203.85, 237],
  r5800x3d: [208.93, 115],
  r5800xt: [208.79, 73],
  r5900x: [299.13, 227],
  r5900xt: [356.3, 64],
  r5950x: [377.13, 367],
  r7500f: [193.09, 85],
  r7500x3d: [192.65, 5],
  r7600: [195.42, 56],
  r7600x: [201.51, 104],
  r7600x3d: [194.48, 10],
  r7700: [261.4, 121],
  r7700x: [271.57, 91],
  r7800x3d: [262.01, 304],
  r7900: [370.5, 72],
  r7900x: [406.71, 127],
  r7900x3d: [395.57, 24],
  r7950x: [539.85, 186],
  r7950x3d: [532.28, 149],
  r8400f: [185.97, 15],
  r8500g: [152.54, 12],
  r8600g: [177.86, 19],
  r8700f: [238.74, 17],
  r8700g: [241.36, 26],
  r9600x: [229.62, 151],
  r9700x: [304.57, 403],
  r9800x3d: [333.03, 989],
  r9900x: [477.3, 300],
  r9900x3d: [466.65, 29],
  r9950x: [615.18, 489],
  r9950x3d: [637.52, 826],
  rpro4650g: [123.46, 7],
  u225f: [212.82, 10],
  u230f: [224.23, 10],
  u245k: [317.95, 25],
  u250k: [432.64, 6],
  u265: [375.6, 12],
  u265f: [359.17, 12],
  u265k: [475.46, 253],
  u265kf: [471.65, 61],
  u270k: [611.12, 20],
  u285: [504.24, 11],
  u285k: [560.39, 256],
};

const blenderGpu = {
  arca380: [560.49, 14],
  arca750: [2276.85, 68],
  arcb570: [1853.02, 7],
  arcb580: [2374.54, 104],
  gtx1050ti: [204.38, 61],
  'gtx1060:3': [276.33, 31],
  'gtx1060:6': [357.84, 41],
  gtx1070: [520.51, 62],
  gtx1070ti: [586.09, 21],
  gtx1080: [582.12, 61],
  gtx1080ti: [816.74, 51],
  gtx1650: [418.3, 128],
  gtx1650super: [480.45, 13],
  gtx1660: [675.94, 20],
  gtx1660super: [744.64, 93],
  gtx1660ti: [741.39, 54],
  rtx2060super: [2054.8, 96],
  rtx2070: [2069.3, 45],
  rtx2070super: [2222.98, 96],
  rtx2080: [2266.76, 29],
  rtx2080super: [2287.13, 34],
  rtx2080ti: [2822.25, 110],
  rtx3060ti: [2743.02, 193],
  rtx3070: [3158.76, 235],
  rtx3070ti: [3491.79, 109],
  rtx3080ti: [5273.48, 183],
  rtx3090: [5383.73, 544],
  rtx3090ti: [5585.15, 115],
  rtx4060: [3125.07, 281],
  rtx4070: [5176.47, 211],
  rtx4070super: [6179.3, 392],
  rtx4070ti: [6345.18, 135],
  rtx4070tisuper: [7086.69, 223],
  rtx4080: [8368.2, 186],
  rtx4080super: [8343.68, 198],
  rtx4090: [11001.48, 453],
  rtx5050: [2863.06, 60],
  rtx5060: [3670.19, 344],
  rtx5070: [6156.45, 843],
  rtx5070ti: [7571.34, 1337],
  rtx5080: [9103.3, 1318],
  rtx5090: [14883.76, 1333],
  rx5600xt: [600.95, 14],
  rx5700xt: [961.09, 47],
  rx6400: [303.21, 7],
  rx6500xt: [415.51, 5],
  rx6600: [927.05, 62],
  rx6600xt: [1050.44, 33],
  rx6650xt: [1059.2, 23],
  rx6700xt: [1472.3, 78],
  rx6750xt: [1543.35, 22],
  rx6800: [1872.62, 33],
  rx6800xt: [2413.97, 37],
  rx6900xt: [2611.8, 44],
  rx6950xt: [2628.56, 31],
  rx7600: [1204.87, 48],
  rx7600xt: [1249.69, 29],
  rx7650gre: [1226.09, 7],
  rx7700xt: [2091.06, 22],
  rx7800xt: [2499.11, 73],
  rx7900gre: [2904.04, 41],
  rx7900xt: [3694.42, 80],
  rx7900xtx: [4385.54, 180],
  rx9070: [2826.97, 69],
  rx9070gre: [2374.22, 6],
  rx9070xt: [3281.8, 581],
};

// Числа из опубликованных графиков Puget Systems. Для 14900K взята серия с PL1 253 Вт.
// 9800X3D добавлен из продолжения той же серии; 9600X тестировали отдельно.
const pugetArticles = [
  ['Puget Systems — Core Ultra 200S', 'https://www.pugetsystems.com/labs/articles/intel-core-ultra-200s-content-creation-review/'],
  ['Puget Systems — Ryzen 7 9800X3D', 'https://www.pugetsystems.com/labs/articles/amd-ryzen-7-9800X3D-content-creation-review/'],
];

const pugetScores = {
  premiere: { r9700x: 9360, r9800x3d: 9774, r9900x: 10083, r9950x: 10410, i14600k: 9628, i14700k: 10564, i14900k: 10941, u245k: 10352, u265k: 11035, u285k: 11468 },
  resolve: { r9700x: 8937, r9800x3d: 9382, r9900x: 9540, r9950x: 10111, i14600k: 9234, i14700k: 10083, i14900k: 9876, u245k: 8895, u265k: 9526, u285k: 9988 },
  photoshop: { r9700x: 11500, r9800x3d: 11430, r9900x: 10862, r9950x: 10964, i14600k: 9070, i14700k: 9669, i14900k: 9660, u245k: 9509, u265k: 9528, u285k: 9822 },
  compile: { r9700x: 3082, r9800x3d: 2507, r9900x: 2089, r9950x: 1821, i14600k: 2233, i14700k: 1651, i14900k: 1770, u245k: 2457, u265k: 1857, u285k: 1546 },
};

function blenderBenchmark(component, label, base, reference, scores, types) {
  const query = 'https://opendata.blender.org/benchmarks/query/?blender_version=4.5.0&operating_system=Windows&group_by=device_name';
  return {
    component, label, base, reference, scores, unit: 'median',
    version: 'Cycles 4.5.0',
    sources: [['Blender Open Data', query + types.map((type) => '&compute_type=' + type).join('')]],
  };
}

function pugetBenchmark(id, label, version, chart, x3dChart) {
  return {
    component: 'cpu', label, base: 'i14600k', reference: 'Core i5-14600K', scores: pugetScores[id],
    unit: id === 'compile' ? 'seconds' : 'points', version,
    sources: [
      ...pugetArticles,
      ['График основной серии', 'https://wp-cdn.pugetsystems.com/2022/08/' + chart + '.png'],
      ['График с 9800X3D', 'https://wp-cdn.pugetsystems.com/2022/08/' + x3dChart + '.png'],
    ],
  };
}

export const WORK_BENCHMARKS = [
  blenderBenchmark('cpu', 'Blender · рендер на процессоре', 'r5600', 'Ryzen 5 5600', blenderCpu, ['CPU']),
  blenderBenchmark('gpu', 'Blender · рендер на видеокарте', 'rtx4060', 'RTX 4060', blenderGpu, ['OPTIX', 'HIP', 'ONEAPI']),
  pugetBenchmark('premiere', 'Premiere Pro · монтаж', 'Premiere Pro 24.6.3, тест Extended', 'ARL-S_PR_Overall', 'R9KX3D_PR'),
  pugetBenchmark('resolve', 'DaVinci Resolve Studio · монтаж', 'Resolve Studio 19.0.2, PugetBench 1.1.0 Extended', 'ARL-S_DR_Overall', 'R9KX3D_DR'),
  pugetBenchmark('photoshop', 'Photoshop · обработка фото', 'Photoshop 25.12, PugetBench 1.0.1', 'ARL-S_PS_Overall', 'R9KX3D_PS'),
  pugetBenchmark('compile', 'Unreal Engine · компиляция кода', 'Unreal Engine 5.3, сборка исходников в Visual Studio', 'ARL-S_UE_CPU_Code', 'R9KX3D_UE_Time_Code'),
];

// Игровой ключ perfdb может объединять близкие CPU. Здесь сохраняем точный суффикс,
// поскольку замеры K/KF и F, а также настольных и мобильных моделей различаются.
export function benchmarkCpuKey(name) {
  const s = String(name || '').normalize('NFKC').toLowerCase().replace(/[‐-―−]/g, '-');
  const ryzen = s.match(/\bryzen\s*[3579]\s+(pro\s+)?(\d{4}[a-z0-9]*)(?![a-z0-9])/);
  if (ryzen) return 'r' + (ryzen[1] ? 'pro' : '') + ryzen[2];
  const intel = s.match(/\bi[3579][\s-]+(\d{4,5}[a-z]*)(?![a-z0-9])/);
  if (intel) return 'i' + intel[1];
  const ultra = s.match(/\bultra\s*[3579][\s-]+(\d{3}[a-z]*)(?![a-z0-9])/);
  if (ultra) return 'u' + ultra[1];
  const core = s.match(/\bcore\s+[3579]\s+(\d{3}[a-z]*)(?![a-z0-9])/);
  if (core) return 'c' + core[1];
  const athlon = s.match(/\bathlon\s*(?:silver\s*|gold\s*)?(pro\s+)?(\d{3,4}(?:ge|g))\b/);
  if (athlon) return 'a' + (athlon[1] ? 'pro' : '') + athlon[2];
  const pentium = s.match(/\b(?:pentium|celeron)\s*(?:gold\s*)?(g\d{4})\b/);
  return pentium ? 'p' + pentium[1] : null;
}

export function benchmarkScore(benchmark, item) {
  if (!item || item.risk?.level === 'blocked' || item.gpu?.issue) return null;
  const key = benchmark.component === 'cpu' ? benchmarkCpuKey(item.name)
    : item.gpu ? item.gpu.variant : item.perf?.variantKey;
  if (!key || !Object.hasOwn(benchmark.scores, key)) return null;
  const measured = benchmark.scores[key];
  const base = benchmark.scores[benchmark.base];
  const ratio = benchmark.unit === 'seconds' ? base / measured
    : benchmark.unit === 'median' ? measured[0] / base[0] : measured / base;
  return { points: Math.round(100 * ratio), count: benchmark.unit === 'median' ? measured[1] : null };
}
