'use strict';
// Таблицы относительной производительности.
// Видеокарты: RTX 4060 = 100 (растеризация, 1080p–1440p, усреднённо).
// Процессоры: Ryzen 5 5600 = 100; [игровая, многопоточная].
// Значения приблизительные: их задача — сравнивать варианты между собой, а не обещать FPS.

const GPU = {
  // NVIDIA RTX 50
  rtx5090: [380, 575], rtx5080: [250, 360], rtx5070ti: [210, 300], rtx5070: [172, 250],
  rtx5060ti: [132, 180], rtx5060: [117, 145], rtx5050: [88, 130],
  // RTX 40
  rtx4090: [300, 450], rtx4080super: [228, 320], rtx4080: [222, 320], rtx4070tisuper: [197, 285],
  rtx4070ti: [182, 285], rtx4070super: [167, 220], rtx4070: [148, 200], rtx4060ti: [118, 160], rtx4060: [100, 115],
  // RTX 30
  rtx3090ti: [170, 450], rtx3090: [156, 350], rtx3080ti: [152, 350], rtx3080: [140, 320], rtx3070ti: [115, 290],
  rtx3070: [108, 220], rtx3060ti: [95, 200], rtx3060: [78, 170], rtx3050: [55, 130],
  // RTX 20 / GTX 16 / 10
  rtx2080ti: [100, 250], rtx2080super: [86, 250], rtx2080: [82, 215], rtx2070super: [76, 215], rtx2070: [68, 175],
  rtx2060super: [64, 175], rtx2060: [56, 160], gtx1660ti: [50, 120], gtx1660super: [50, 125], gtx1660: [45, 120],
  gtx1650super: [38, 100], gtx1650: [30, 75], gtx1630: [20, 75], gtx1080ti: [68, 250], gtx1080: [54, 180],
  gtx1070ti: [50, 180], gtx1070: [45, 150], gtx1060: [32, 120], gtx1050ti: [20, 75], gtx1050: [16, 75],
  gt1030: [9, 30], gtx750ti: [12, 60], gtx750: [10, 55], gt740: [5, 64], gt730: [4, 38], gt710: [3, 19], gt610: [2, 29], gt210: [1, 30],
  // AMD RX 9000 / 7000 / 6000 / 5000 / 500
  rx9070xt: [215, 304], rx9070: [190, 220], rx9070gre: [160, 220], rx9060xt: [122, 160], rx9060: [105, 132],
  rx7900xtx: [232, 355], rx7900xt: [198, 315], rx7900gre: [165, 260], rx7800xt: [152, 263], rx7700xt: [127, 245],
  rx7700: [118, 200], rx7650gre: [100, 170], rx7600xt: [96, 190], rx7600: [90, 165], rx7400: [55, 55],
  rx6950xt: [150, 335], rx6900xt: [140, 300], rx6800xt: [134, 300], rx6800: [118, 250], rx6750xt: [104, 250],
  rx6750gre: [98, 230], rx6700xt: [100, 230], rx6700: [90, 175], rx6650xt: [86, 180], rx6600xt: [82, 160],
  rx6600: [72, 132], rx6500xt: [35, 107], rx6400: [26, 53], rx5700xt: [68, 225], rx5700: [62, 180],
  rx5600xt: [56, 150], rx5500xt: [36, 130], rx590: [33, 225], rx580: [30, 185], rx570: [26, 150],
  rx560: [12, 80], rx550: [8, 50],
  // Intel Arc
  arcb580: [100, 190], arcb570: [86, 150], arca770: [82, 225], arca750: [75, 225], arca580: [68, 185],
  arca380: [25, 75], arca310: [12, 75],
};

const GPU_NAMES = {};
for (const k of Object.keys(GPU)) {
  let n = k
    .replace(/^rtx/, 'RTX ').replace(/^gtx/, 'GTX ').replace(/^gt(?=\d)/, 'GT ')
    .replace(/^rx/, 'RX ').replace(/^arc/, 'Arc ')
    .replace(/tisuper$/, ' Ti SUPER').replace(/ti$/, ' Ti').replace(/super$/, ' SUPER')
    .replace(/xtx$/, ' XTX').replace(/xt$/, ' XT').replace(/gre$/, ' GRE');
  if (k.startsWith('arc')) n = 'Arc ' + k.slice(3).toUpperCase();
  GPU_NAMES[k] = n;
}

/** Определяет ключ GPU по названию товара. Возвращает null для профессиональных/неизвестных. */
function gpuKey(name) {
  const s = String(name || '').toLowerCase().replace(/[‐-―]/g, '-');
  if (/\bquadro\b|\brtx\s*a\d|\btesla\b|\bradeon\s+pro\b|\bfirepro\b/.test(s)) return null;
  let m = s.match(/\b(rtx|gtx|gt)\s*-?\s*(\d{3,4})\s*(ti\s*super|ti|super)?\b/);
  if (m) {
    const k = m[1] + m[2] + (m[3] ? m[3].replace(/\s+/g, '') : '');
    if (GPU[k]) return k;
    const base = m[1] + m[2];
    return GPU[base] ? base : null;
  }
  m = s.match(/\brx\s*-?\s*(\d{3,4})\s*(xtx|xt|gre)?\b/);
  if (m) {
    const k = 'rx' + m[1] + (m[2] || '');
    if (GPU[k]) return k;
    return GPU['rx' + m[1]] ? 'rx' + m[1] : null;
  }
  m = s.match(/\barc\s*-?\s*([ab])\s*(\d{3})\b/);
  if (m) {
    const k = 'arc' + m[1] + m[2];
    return GPU[k] ? k : null;
  }
  return null;
}

/** Производительность и энергопотребление видеокарты с поправкой на объём памяти. */
function gpuPerf(key, vramGb) {
  const row = GPU[key];
  if (!row) return null;
  let [score, watts] = row;
  if (vramGb) {
    if (key === 'rtx3060' && vramGb <= 8) score *= 0.88;
    else if (key === 'rtx3050' && vramGb <= 6) score *= 0.78;
    else if (vramGb <= 8 && score >= 105) score *= 0.95; // 8 ГБ мало для современных игр в 1440p
    else if (vramGb >= 16 && (key === 'rtx5060ti' || key === 'rx9060xt' || key === 'rtx4060ti')) score *= 1.02;
  }
  return { score: Math.round(score), watts, name: GPU_NAMES[key] };
}

// ---------------------------------------------------------------- CPU
const CPU = {
  // AMD AM4
  r1200: [45, 35], r1600: [55, 60], r2200g: [45, 35], r2400g: [50, 48], r2600: [62, 70], r2700x: [68, 90],
  r3100: [65, 50], r3300x: [75, 58], r3200g: [52, 42], r3400g: [55, 52], r3500x: [72, 65], r3600: [80, 82],
  r3600x: [82, 85], r3700x: [85, 115], r3800x: [86, 118], r3900x: [88, 160], r3950x: [88, 195],
  r4100: [68, 55], r4300g: [60, 50], r4350g: [62, 55], r5350g: [70, 58], r5650g: [86, 92], r5655g: [86, 92],
  r5750g: [92, 122], r5755g: [92, 122], r3900: [86, 150], r8300g: [88, 80], r7500x3d: [150, 130],
  a3000g: [35, 22], a200ge: [30, 19], a220ge: [31, 20], a240ge: [32, 20], a300ge: [33, 21], a3125ge: [30, 19], r4500: [76, 78], r4600g: [76, 80], r4650g: [76, 80],
  r5300g: [70, 58], r5500: [86, 92], r5500x3d: [112, 95], r5500gt: [84, 90], r5600g: [86, 92], r5600gt: [88, 95],
  r5600: [100, 100], r5600x: [104, 104], r5600t: [102, 102], r5600xt: [105, 106], r5600x3d: [120, 102],
  r5700: [92, 118], r5700g: [92, 122], r5700x: [106, 130], r5800x: [109, 134], r5800xt: [110, 136],
  r5700x3d: [120, 124], r5800x3d: [124, 128], r5900x: [111, 182], r5900xt: [111, 220], r5950x: [113, 225],
  // AMD AM5
  r7400f: [121, 125], r7500f: [125, 135], r7600: [127, 138], r7600x: [131, 143], r7600x3d: [158, 140],
  r7700: [132, 180], r7700x: [135, 185], r7800x3d: [165, 175], r7900: [134, 240], r7900x: [138, 255],
  r7900x3d: [158, 250], r7950x: [140, 310], r7950x3d: [165, 305],
  r8400f: [110, 122], r8500g: [104, 118], r8600g: [114, 132], r8700f: [118, 160], r8700g: [118, 162],
  r9500f: [133, 148], r9600: [137, 150], r9600x: [140, 155], r9700x: [146, 198], r9800x3d: [185, 210],
  r9900x: [148, 270], r9900x3d: [168, 268], r9950x: [150, 330], r9950x3d: [186, 335],
  // Intel LGA1700
  pg6900: [42, 22], pg7400: [58, 36],
  i12100: [90, 74], i13100: [94, 77], i14100: [96, 79], i12400: [101, 104], i13400: [106, 128], i14400: [109, 133],
  i12500: [104, 110], i13500: [110, 160], i14500: [113, 166], i12600: [106, 112], i13600: [114, 170],
  i14600: [117, 175], i12600k: [115, 145], i13600k: [130, 185], i14600k: [133, 192],
  i12700: [118, 170], i12700k: [124, 185], i13700: [128, 215], i13700k: [138, 242], i14700: [132, 240],
  i14700k: [142, 272], i12900: [125, 200], i12900k: [130, 212], i13900: [137, 260], i13900k: [146, 292],
  i14900: [140, 270], i14900k: [149, 298], c120: [104, 108], c220: [110, 135],
  // Intel LGA1851
  u225: [113, 150], u230: [116, 155], u235: [118, 185], u245: [124, 190], u245k: [128, 200], u250k: [131, 215],
  u265: [134, 265], u265k: [138, 282], u270k: [142, 300], u285: [138, 300], u285k: [143, 330],
  // Intel LGA1200 / LGA1151
  pg5905: [35, 18], pg6400: [50, 32], pg6405: [51, 33],
  i10100: [74, 58], i10300: [76, 62], i10600: [88, 92], i11600: [99, 100], i12300: [94, 78], i12490: [102, 106], i10105: [75, 59], i10400: [84, 84], i11400: [95, 95], i10500: [86, 88], i11500: [98, 98],
  i10600k: [90, 95], i11600k: [101, 104], i10700: [94, 128], i10700k: [97, 135], i11700: [101, 138],
  i11700k: [104, 145], i10900: [96, 150], i10900k: [100, 160], i11900k: [106, 148],
  i8400: [74, 68], i8700: [80, 95], i9400: [76, 70], i9600k: [82, 76], i9700: [86, 95], i9700k: [88, 98],
  i9900k: [92, 130], i7700: [70, 58],
};

/** Ключ процессора по названию: r7500f, i12400 (F отбрасывается), u245k, pg7400. */
function cpuKey(name) {
  const s = String(name || '').toLowerCase().replace(/[‐-―]/g, '-');
  let m = s.match(/ryzen\s*\d\s*(?:pro\s*)?(\d{4})\s*([a-z0-9]*)/);
  if (m) {
    const suffix = m[2].replace(/^(x3d|xt|x|gt|ge|g|f|t)?.*$/, '$1');
    const k = 'r' + m[1] + suffix;
    if (CPU[k]) return k;
    // 7500F/8400F/9500F/7400F есть в таблице с f, у остальных F — это просто без графики
    const noF = 'r' + m[1] + suffix.replace(/f$/, '');
    if (CPU[noF]) return noF;
    if (CPU[k + 'f']) return k + 'f';
    if (suffix === 'ge' && CPU['r' + m[1] + 'g']) return 'r' + m[1] + 'g';
    if (CPU['r' + m[1]]) return 'r' + m[1];
    return null;
  }
  m = s.match(/\bi([3579])\s*-\s*(\d{4,5})([a-z]*)/) || s.match(/core\s+i([3579])\s+(\d{4,5})([a-z]*)/);
  if (m) {
    const suf = m[3].replace(/f$/, '').replace(/^kf$/, 'k').replace(/^(k|t)?.*$/, '$1');
    const k = 'i' + m[2] + suf;
    if (CPU[k]) return k;
    return CPU['i' + m[2]] ? 'i' + m[2] : null;
  }
  m = s.match(/ultra\s*([3579])\s*(\d{3})([a-z]*)/);
  if (m) {
    const suf = m[3].replace(/f$/, '').replace(/^kf$/, 'k').replace(/^(k)?.*$/, '$1');
    const k = 'u' + m[2] + suf;
    if (CPU[k]) return k;
    return CPU['u' + m[2]] ? 'u' + m[2] : null;
  }
  m = s.match(/\bcore\s+([3579])\s+(\d{3})([a-z]*)/);
  if (m) return CPU['c' + m[2]] ? 'c' + m[2] : null;
  m = s.match(/athlon\s*(?:silver\s*|gold\s*)?(?:pro\s*)?(\d{3,4})(ge|g)\b/);
  if (m) return CPU['a' + m[1] + m[2]] ? 'a' + m[1] + m[2] : null;
  m = s.match(/(?:pentium|celeron)\s*(?:gold\s*)?(g\d{4})/);
  if (m) return CPU['p' + m[1]] ? 'p' + m[1] : null;
  return null;
}

const ARCH_IPC = [
  [/zen\s*5/i, 1.22], [/zen\s*4/i, 1.13], [/zen\s*3/i, 1.0], [/zen\s*2/i, 0.85], [/zen\+/i, 0.75], [/zen/i, 0.7],
  [/arrow/i, 1.08], [/raptor/i, 1.05], [/alder/i, 1.0], [/rocket/i, 0.92], [/comet/i, 0.82], [/coffee/i, 0.8],
  [/kaby|skylake/i, 0.75], [/broadwell|haswell/i, 0.65],
];

/** Эвристика для процессоров, которых нет в таблице. */
function cpuHeuristic(spec) {
  if (!spec || !spec.cores) return null;
  let ipc = 0.7;
  for (const [re, v] of ARCH_IPC) if (re.test(spec.arch || '')) { ipc = v; break; }
  const boost = spec.boostGhz || 3.5;
  const coreF = spec.cores >= 8 ? 1.05 : spec.cores >= 6 ? 1 : spec.cores >= 4 ? 0.78 : 0.55;
  const x3d = spec.l3 >= 64 ? 1.2 : 1;
  const gaming = 100 * (boost / 4.4) * ipc * coreF * x3d;
  const eff = spec.cores + 0.3 * Math.max(0, (spec.threads || spec.cores) - spec.cores);
  const multi = 100 * (eff / 7.8) * (boost / 4.4) * ipc;
  return [Math.round(gaming), Math.round(multi)];
}

function igpuScore(key, name, spec) {
  const s = String(name || '').toLowerCase();
  if (!spec || !spec.hasIgpu) return 0;
  if (/8[67]00g/.test(s)) return 30;
  if (/8[56]00g|8300g/.test(s)) return 18;
  if (/5[5-7]00g|5600gt|5500gt/.test(s)) return 14;
  if (/4[3-6][05]0g/.test(s)) return 12;
  if (/[23][24]00g/.test(s)) return 9;
  if (spec.socket === 'AM5') return 7;
  if (spec.socket === 'LGA1851') return 12;
  if (spec.socket === 'LGA1700') return 6;
  return 4;
}

/** Итоговые показатели процессора: { gaming, multi, igpu, known } */
function cpuPerf(name, spec) {
  const key = cpuKey(name);
  let row = key ? CPU[key] : null;
  const known = !!row;
  if (!row) row = cpuHeuristic(spec);
  if (!row) return null;
  return { key, gaming: row[0], multi: row[1], igpu: igpuScore(key, name, spec), known };
}

module.exports = { GPU, CPU, gpuKey, gpuPerf, cpuKey, cpuPerf, GPU_NAMES };
