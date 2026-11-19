// Примерный FPS в популярных играх и потребление электроэнергии.
// FPS считается от индексов процессора и видеокарты (RTX 4060 + Ryzen 5 5600 = 100):
// упираемся либо в видеокарту (зависит от разрешения), либо в процессор. Это ориентир ±20%,
// реальные цифры зависят от версии игры, драйверов, настроек и сцены.

const GAMES = [
  // cpu — FPS при процессоре с индексом 100; gpu — при видеокарте с индексом 100 в 1080p / 1440p / 4K
  { name: 'Counter-Strike 2', preset: 'высокие', cpu: 300, gpu: [260, 190, 105] },
  { name: 'Dota 2', preset: 'высокие', cpu: 170, gpu: [200, 160, 95] },
  { name: 'Valorant', preset: 'высокие', cpu: 420, gpu: [450, 330, 190] },
  { name: 'Fortnite', preset: 'высокие, DX12', cpu: 160, gpu: [110, 75, 40] },
  { name: 'Apex Legends', preset: 'высокие', cpu: 200, gpu: [170, 120, 65] },
  { name: 'PUBG', preset: 'высокие', cpu: 160, gpu: [150, 110, 60] },
  { name: 'GTA V', preset: 'очень высокие', cpu: 140, gpu: [150, 115, 65] },
  { name: 'Call of Duty: Warzone', preset: 'высокие', cpu: 140, gpu: [115, 82, 45], heavy: true },
  { name: 'Cyberpunk 2077', preset: 'высокие, без RT и DLSS', cpu: 110, gpu: [78, 52, 25], heavy: true },
  { name: 'Red Dead Redemption 2', preset: 'высокие', cpu: 110, gpu: [75, 55, 30], heavy: true },
];

export const RESOLUTIONS = [['1080', '1080p'], ['1440', '1440p'], ['2160', '4K']];

/** FPS по играм для сборки. Возвращает null, если видеокарта «своя» (неизвестна). */
export function fpsTable(parts, res = '1080', haveGpu = false) {
  const cpu = parts.cpu;
  if (!cpu || !cpu.perf || haveGpu) return null;
  const gpu = parts.gpu;
  const g = gpu && gpu.perf ? gpu.perf.score : cpu.perf.igpu || 1;
  const c = cpu.perf.gaming || 50;
  const rs = parts.ram && parts.ram.specs;
  let ramF = 1;
  if (rs && rs.totalGb) {
    if (rs.totalGb < 15) ramF *= 0.85;
    if (rs.modules === 1) ramF *= gpu ? 0.93 : 0.8;
  }
  const ri = res === '2160' ? 2 : res === '1440' ? 1 : 0;
  const vram = gpu && gpu.specs ? gpu.specs.vramGb : null;
  return GAMES.map((game) => {
    let gpuFps = (game.gpu[ri] * g) / 100;
    // 8 ГБ видеопамяти мало для тяжёлых игр в высоком разрешении
    if (vram && vram <= 8 && game.heavy && ri >= 1) gpuFps *= ri === 2 ? 0.8 : 0.92;
    const cpuFps = (game.cpu * c) / 100;
    const fps = Math.max(1, Math.round(Math.min(gpuFps, cpuFps) * ramF));
    return { name: game.name, preset: game.preset, fps, limit: cpuFps < gpuFps ? 'cpu' : 'gpu' };
  });
}

/** Потребление (Вт) в играх и в простых задачах. */
export function powerDraw(parts) {
  const C = window.Compat;
  const cpu = parts.cpu;
  if (!cpu) return null;
  const cpuMax = C.cpuPower(cpu);
  const gpuMax = parts.gpu ? C.gpuPower(parts.gpu) : 0;
  const base = 45; // плата, память, накопители, вентиляторы
  const game = Math.round(cpuMax * 0.55 + gpuMax * 0.85 + base);
  const office = Math.round(base + Math.min(40, (cpu.specs && cpu.specs.tdp ? cpu.specs.tdp : 65) * 0.3) + (parts.gpu ? 15 : 0));
  return { game, office };
}

/** Счёт за электроэнергию в месяц. */
export function monthlyCost(draw, { tariff = 0.27, gameHours = 4, officeHours = 4 } = {}) {
  if (!draw) return null;
  const kwh = ((draw.game * gameHours + draw.office * officeHours) * 30) / 1000;
  return { kwh: Math.round(kwh), cost: Math.round(kwh * tariff * 100) / 100 };
}
