'use strict';
// Тесты без сети: разбор описаний, распознавание моделей, совместимость, оптимизатор на подставных данных.
// Запуск: npm test        (добавьте --live, чтобы прогнать подбор на живых данных Onliner)

const assert = require('assert');
const { parseSpecs, parseHardware, gpuConnectors } = require('../server/parsers');
const perf = require('../server/perfdb');
const Compat = require('../web/compat');

let passed = 0;
let failed = 0;
const pending = [];
function test(name, fn) {
  const ok = () => {
    passed++;
    console.log('  ✓ ' + name);
  };
  const fail = (e) => {
    failed++;
    console.log('  ✗ ' + name + '\n    ' + e.message);
  };
  try {
    const r = fn();
    if (r && typeof r.then === 'function') pending.push(r.then(ok, fail));
    else ok();
  } catch (e) {
    fail(e);
  }
}

console.log('Разбор описаний');
test('процессор AMD', () => {
  const s = parseSpecs('cpu', '2022 г, Vermeer (Zen 3), сокет AM4, 6 ядер, 12 потоков, частота 4.4/3.5 ГГц, кэш 3 МБ + 32 МБ, техпроцесс 7 нм, поддержка DDR4, TDP 65W, OEM (без коробки, без кулера)', 'AMD Ryzen 5 5600');
  assert.strictEqual(s.socket, 'AM4');
  assert.strictEqual(s.cores, 6);
  assert.strictEqual(s.threads, 12);
  assert.strictEqual(s.boostGhz, 4.4);
  assert.deepStrictEqual(s.mem, ['DDR4']);
  assert.strictEqual(s.tdp, 65);
  assert.strictEqual(s.l3, 32);
  assert.strictEqual(s.hasIgpu, false);
  assert.strictEqual(s.withCooler, false);
});
test('процессор Intel с DDR4/DDR5 и BOX с кулером', () => {
  const s = parseSpecs('cpu', '2024 г, Raptor Lake-R, сокет LGA1700, 4 ядра, 8 потоков, частота 4.7/3.5 ГГц, кэш 5 МБ + 12 МБ, техпроцесс 10 нм, поддержка DDR5/DDR4, TDP 60W, BOX (в цветной коробке, с кулером)', 'Intel Core i3-14100 (BOX)');
  assert.strictEqual(s.socket, 'LGA1700');
  assert.deepStrictEqual(s.mem.sort(), ['DDR4', 'DDR5']);
  assert.strictEqual(s.withCooler, true);
  assert.strictEqual(s.hasIgpu, true);
});
test('AM5 без F — со встроенной графикой, с F — без', () => {
  assert.strictEqual(parseSpecs('cpu', 'сокет AM5, 6 ядер', 'AMD Ryzen 5 7600').hasIgpu, true);
  assert.strictEqual(parseSpecs('cpu', 'сокет AM5, 6 ядер', 'AMD Ryzen 5 7500F').hasIgpu, false);
  assert.strictEqual(parseSpecs('cpu', 'сокет AM4, 6 ядер', 'AMD Ryzen 5 5600GT').hasIgpu, true);
});
test('материнская плата', () => {
  const s = parseSpecs('motherboard', 'mATX, сокет AMD AM5, чипсет AMD B850, память 4xDDR5, слоты: 2xPCIe x16 5.0, 2xM.2, 802.11ax (Wi-Fi 6)+Bluetooth 5.3, 12+2+1 фаз питания');
  assert.strictEqual(s.form, 'mATX');
  assert.strictEqual(s.socket, 'AM5');
  assert.strictEqual(s.chipset, 'B850');
  assert.strictEqual(s.mem, 'DDR5');
  assert.strictEqual(s.memSlots, 4);
  assert.strictEqual(s.m2, 2);
  assert.strictEqual(s.wifi, true);
});
test('память и SO-DIMM', () => {
  const s = parseSpecs('dram', '32 ГБ, 2 модуля DDR5 DIMM по 16 ГБ, частота 6000 МГц, CL 36T, тайминги 36-38-38-86, напряжение 1.35 В');
  assert.strictEqual(s.totalGb, 32);
  assert.strictEqual(s.modules, 2);
  assert.strictEqual(s.type, 'DDR5');
  assert.strictEqual(s.form, 'DIMM');
  assert.strictEqual(s.mhz, 6000);
  assert.strictEqual(parseSpecs('dram', '8 ГБ, 1 модуль DDR4 SO-DIMM, частота 3200 МГц').form, 'SO-DIMM');
});
test('SSD, БП, корпус, кулер, видеокарта', () => {
  const ssd = parseSpecs('ssd', '1 ТБ, M.2 2280, PCI Express 4.0 x4, последовательный доступ: 7400/6000 МБайт/с');
  assert.strictEqual(ssd.capacityGb, 1000);
  assert.strictEqual(ssd.iface, 'NVMe');
  assert.strictEqual(ssd.read, 7400);
  const psu = parseSpecs('powersupply', 'ATX 850 Вт, золотой сертификат 80 Plus, модульный, 1x 12В 70.9А, 1x PCIe Gen5');
  assert.strictEqual(psu.watts, 850);
  assert.strictEqual(psu.cert, 4);
  assert.strictEqual(psu.modular, 'full');
  const c = parseSpecs('chassis', 'Mid Tower, БП отсутствует, для плат ATX/micro-ATX/mini-ITX, с 6 вентиляторами в комплекте, окно: закаленное стекло, видеокарта до 410 мм, охлаждение ЦП до 165 мм');
  assert.deepStrictEqual(c.boards, ['ATX', 'mATX', 'ITX']);
  assert.strictEqual(c.psuIncluded, false);
  assert.strictEqual(c.gpuMaxMm, 410);
  assert.strictEqual(c.fans, 6);
  const m = parseSpecs('chassis', 'Mini Tower, БП отсутствует, для плат micro-ATX/mini-ITX');
  assert.deepStrictEqual(m.boards, ['mATX', 'ITX']);
  assert.strictEqual(m.fans, null);
  const cool = parseSpecs('fan', 'рассеивание до 220 Вт, высота 154 мм, вентилятор 120 мм');
  assert.strictEqual(cool.dissipationWatts, 220);
  assert.strictEqual(cool.heightMm, 154);
  const g = parseSpecs('videocard', '16 ГБ GDDR7, 2300 МГц / 2452 МГц, 8960sp, 70 RT-ядер, трассировка лучей, 256 бит, 2.5 слота, питание 16 pin (12V-2x6), HDMI, DisplayPort');
  assert.strictEqual(g.vramGb, 16);
  assert.strictEqual(g.vramType, 'GDDR7');
});

console.log('Распознавание моделей');
test('видеокарты', () => {
  const cases = {
    'MSI GeForce RTX 4060 Ti Gaming X Slim 8G': 'rtx4060ti',
    'Palit GeForce RTX 5070 Ti GamingPro-S NE7507T019T2-GB2031U': 'rtx5070ti',
    'PNY GeForce RTX 5060 8GB Overclocked Dual Fan': 'rtx5060',
    'ASUS Dual Radeon RX 7600 EVO OC Edition 8GB': 'rx7600',
    'Sapphire Pulse Radeon RX 7900 XTX': 'rx7900xtx',
    'Gigabyte Radeon RX 9070 GRE Gaming OC 12G': 'rx9070gre',
    'ASRock Intel Arc B580 Challenger 12GB OC': 'arcb580',
    'PCWINMAX GeForce GTX 1660 Super 6GB GDDR6': 'gtx1660super',
    'GeForce RTX 4070 Ti SUPER': 'rtx4070tisuper',
    'PNY RTX A400 VCNRTXA400-SB': null,
  };
  for (const [name, key] of Object.entries(cases)) assert.strictEqual(perf.gpuKey(name), key, name);
});
test('процессор пишут по-разному: «i7 9700K», «Core i5 10400», «i5-12400F»', () => {
  const perf = require('../server/perfdb');
  assert.strictEqual(perf.cpuKey('i7 9700K'), 'i9700k');
  assert.strictEqual(perf.cpuKey('Core i5 10400'), 'i10400');
  assert.strictEqual(perf.cpuKey('Процессор Intel Core i5-12400F BOX'), 'i12400');
});

test('процессоры', () => {
  const cases = {
    'AMD Ryzen 5 5600': 'r5600', 'AMD Ryzen 5 5600 (BOX)': 'r5600', 'AMD Ryzen 7 7800X3D': 'r7800x3d',
    'AMD Ryzen 5 7500F': 'r7500f', 'AMD Ryzen 5 7400': 'r7400f', 'AMD Ryzen 7 Pro 5750G': 'r5750g',
    'Intel Core i5-12400F': 'i12400', 'Intel Core i5-13600KF': 'i13600k', 'Intel Core i9-14900KS': 'i14900k',
    'Intel Core Ultra 7 265KF': 'u265k', 'Intel Core Ultra 5 225F': 'u225', 'Intel Pentium Gold G7400': 'pg7400',
    'AMD Athlon 3000G (BOX)': 'a3000g',
  };
  for (const [name, key] of Object.entries(cases)) assert.strictEqual(perf.cpuKey(name), key, name);
});
test('Kufar-заголовки распознаются', () => {
  assert.strictEqual(perf.gpuKey('Rtx 4060 palit 8 gb'), 'rtx4060');
  assert.strictEqual(perf.gpuKey('видеокарта rtx 4060 ti'), 'rtx4060ti');
  assert.strictEqual(perf.cpuKey('Процессор AMD Ryzen 5 7500F, AM5'), 'r7500f');
  assert.strictEqual(perf.cpuKey('ryzen 5 7500f 25года'), 'r7500f');
});

console.log('Совместимость');
const cpu = { name: 'AMD Ryzen 5 7500F', price: 400, specs: { socket: 'AM5', mem: ['DDR5'], tdp: 65, hasIgpu: false }, perf: { gaming: 125, multi: 135, igpu: 0 } };
const mbAm4 = { name: 'B550M', price: 250, specs: { socket: 'AM4', mem: 'DDR4', form: 'mATX', memSlots: 2, m2: 1, chipset: 'B550' } };
const mbAm5 = { name: 'B650M', price: 300, specs: { socket: 'AM5', mem: 'DDR5', form: 'mATX', memSlots: 2, m2: 1, chipset: 'B650' } };
const ram = { name: 'DDR5 2x16', price: 500, specs: { type: 'DDR5', form: 'DIMM', modules: 2, totalGb: 32 } };
test('сокет не совпадает — ошибка', () => {
  const r = Compat.check({ cpu, motherboard: mbAm4, ram }, {});
  assert.ok(r.some((c) => c.level === 'error' && /Сокет/.test(c.text)));
});
test('нет видеокарты и встроенной графики — ошибка', () => {
  const r = Compat.check({ cpu, motherboard: mbAm5, ram }, {});
  assert.ok(r.some((c) => c.level === 'error' && /встроенной графики/.test(c.text)));
});
test('слабый БП — ошибка, нормальный — ок', () => {
  const gpu = { name: 'RTX 5070', perf: { watts: 250, score: 172 }, specs: {} };
  const weak = Compat.check({ cpu, motherboard: mbAm5, ram, gpu, psu: { specs: { watts: 300 } } }, {});
  assert.ok(weak.some((c) => c.level === 'error' && /Блок питания/.test(c.text)));
  const need = Compat.psuNeed(cpu, gpu);
  assert.ok(need.rec >= 550 && need.rec <= 650, 'рекомендация ' + need.rec);
  const ok = Compat.check({ cpu, motherboard: mbAm5, ram, gpu, psu: { specs: { watts: need.rec } } }, {});
  assert.ok(ok.some((c) => c.level === 'ok' && /Блок питания/.test(c.text)));
});
test('ATX-плата в mATX-корпус не влезает', () => {
  assert.strictEqual(Compat.boardFitsCase('ATX', { specs: { boards: ['mATX', 'ITX'] } }), false);
  assert.strictEqual(Compat.boardFitsCase('mATX', { specs: { boards: ['ATX', 'mATX'] } }), true);
});
test('индексы: RTX 4060 + Ryzen 5 5600 ≈ 100', () => {
  const i = Compat.indices({ cpu: { perf: { gaming: 100, multi: 100, igpu: 0 } }, gpu: { perf: { score: 100 } }, ram: { specs: { totalGb: 32, modules: 2 } } });
  assert.strictEqual(i.gaming, 100);
  assert.strictEqual(i.work, 100);
});

console.log('Фильтры Onliner');
const F = require('../server/filters');
test('списки пересекаются, противоречие — null', () => {
  assert.deepStrictEqual(F.merge({ socket_cpu: ['am4', 'am5'] }, { socket_cpu: ['am5', 'lga1700'] }).socket_cpu, ['am5']);
  assert.strictEqual(F.merge({ dramkit: ['ddr4dimm'] }, { dramkit: ['ddr5dimm'] }), null);
  assert.deepStrictEqual(F.merge({ order: 'price:asc' }, { mfr: ['asus'] }), { order: 'price:asc', mfr: ['asus'] });
});
test('диапазоны: общая часть', () => {
  assert.deepStrictEqual(F.merge({ price: { from: 100, to: 500 } }, { price: { to: 300 } }).price, { from: 100, to: 300 });
  assert.strictEqual(F.merge({ price: { from: 400, to: 500 } }, { price: { to: 300 } }), null);
  assert.deepStrictEqual(F.merge({ volume_dram: { from: '16gb', to: '16gb' } }, { volume_dram: { from: '16gb' } }).volume_dram, { from: '16gb', to: '16gb' });
  assert.strictEqual(F.merge({ volume_dram: { from: '16gb', to: '16gb' } }, { volume_dram: { from: '32gb' } }), null);
  assert.strictEqual(F.merge({ volume_hdd: { from: '960gb', to: '1tb' } }, { volume_hdd: { from: '2tb' } }), null);
});
test('флаги должны совпасть', () => {
  assert.strictEqual(F.merge({ mother_wifi: 1 }, { mother_wifi: 0 }), null);
  assert.deepStrictEqual(F.merge({ mother_wifi: 1 }, { mother_wifi: 1 }), { mother_wifi: 1 });
});
test('объёмы из фильтра и очистка мусора', () => {
  assert.strictEqual(F.rangeNum('1_2tb'), 1200);
  assert.strictEqual(F.rangeNum('dram3200'), 3200);
  assert.ok(F.inRange(32, { from: '32gb' }) && !F.inRange(16, { from: '32gb' }) && F.inRange(1000, { from: '512gb', to: '2tb' }));
  assert.deepStrictEqual(F.sanitize({ mfr: ['asus', 'bad id!'], price: { from: '100', to: 'x y' }, backlit: true, 'evil key': [1], shops: ['1'] }),
    { mfr: ['asus'], price: { from: '100' }, backlit: 1 });
});
test('СЖО распознаётся, высота радиатора не путается с высотой кулера', () => {
  const c = parseSpecs('fan', 'типоразмер 360, высота 52 мм, вентилятор 120 мм', 'Arctic Liquid Freezer III 360');
  assert.strictEqual(c.aio, true);
  assert.strictEqual(c.radMm, 360);
  assert.strictEqual(c.heightMm, null);
  assert.strictEqual(c.dissipationWatts, null);
  assert.deepStrictEqual(Compat.coolerLabels({ specs: c }), ['СЖО', 'Типоразмер радиатора 360 мм', 'Вентилятор 120 мм']);
});

test('охлаждение: число трубок только из поля Onliner, тип и размеры только по характеристикам', () => {
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  const spec = parseHardware('fan', row('Конструкция кулера ЦП', 'башенный')
    + row('Тепловые трубки', '7') + row('Высота (толщина)', '154 мм'));
  assert.deepStrictEqual(spec, { coolerDesign: 'tower', heightMm: 154, heatpipes: 7 });
  const known = { source: 'onliner', specs: { ...spec, catalogHardware: true } };
  assert.deepStrictEqual(Compat.coolerLabels(known), ['Башенный кулер', 'Высота 154 мм', 'Тепловых трубок — 7']);
  assert.ok(!Compat.coolerLabels({ ...known, source: 'kufar' }).some((label) => /трубок/.test(label)));
  assert.strictEqual(parseHardware('fan', row('Тепловые трубки', '6–7')).heatpipes, undefined);
  assert.strictEqual(parseHardware('fan', row('Рассеиваемая мощность (TDP)', '285 Вт')).dissipationWatts, 285);
  assert.deepStrictEqual(parseHardware('fan', row('Тип', 'система жидкостного охлаждения для процессора')
    + row('Типоразмер СЖО', '240') + row('Высота (толщина)', '38 мм') + row('Длина трубки', '0.45 м')), { aio: true, radMm: 240 });
});

test('сборка и «Почему эта деталь» не показывают подставленную мощность, тип и число трубок', async () => {
  const { enrich } = require('../server/kufarCompat');
  const used = await enrich('cooler', { name: 'DeepCool AK500', description: 'Рабочий кулер, высота 158 мм.' });
  assert.strictEqual(used.specs.dissipationWatts, null);
  assert.strictEqual(Compat.coolerClass(used), 'Кулер');
  const cpu = { name: 'Ryzen 5 5600', specs: { tdp: 65, hasIgpu: true } };
  const saved = { name: 'Thermalright Phantom Spirit 120', source: 'onliner', specs: { tdp: 260, heightMm: 154 } };
  const restored = Compat.check({ cpu, cooler: saved }, {});
  assert.ok(restored.some((c) => c.level === 'warn' && c.text.includes('мощность кулера не указана')));
  assert.ok(restored.every((c) => !/260|6–7|4–5|двухбашенный|с запасом/i.test(c.text)));
  const correct = { specs: { dissipationWatts: 55 } };
  assert.ok(Compat.check({ cpu, cooler: correct }, {}).some((c) => c.level === 'warn' && /55 Вт/.test(c.text)));
  const original = globalThis.Compat;
  globalThis.Compat = Compat;
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const code = fs.readFileSync(path.join(__dirname, '../web/js/explain.js'), 'utf8');
    const { explainPart } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    const labels = explainPart('cooler', saved, { cpu });
    assert.deepStrictEqual(labels, ['Кулер.', 'Высота 154 мм.', 'В характеристиках не указана рассеиваемая мощность.']);
  } finally {
    globalThis.Compat = original;
  }
});

console.log('Kufar и каталог разделов');
test('фильтры Kufar → параметры поиска', () => {
  const KF = require('../server/providers/kufarFilters');
  assert.deepStrictEqual(KF.toParams({ ccbr: ['13', '54'], rgn: ['7'], prc: { from: 500, to: 1500 }, dle: 1, ar: [] }),
    { ccbr: 'v.or:13,54', rgn: '7', prc: 'r:50000,150000', dle: '1' });
  assert.deepStrictEqual(KF.toParams({ prc: { to: 300 } }), { prc: 'r:0,30000' }, 'открытый диапазон Kufar отвергает (422) — нижняя граница 0');
});
test('каталог: у каждого раздела есть источник, сетап ссылается на разделы', () => {
  const C = require('../web/catalog');
  const ids = new Set();
  for (const s of C.SECTIONS) {
    assert.ok(!ids.has(s.id), 'повтор ' + s.id);
    ids.add(s.id);
    assert.ok(s.onliner || s.kufar || s.kufarQuery, 'нет источника у ' + s.id);
    assert.ok(C.GROUPS.some((g) => g.id === s.group), 'нет группы у ' + s.id);
  }
  for (const x of C.SETUP) assert.ok(C.byId[x.id] && C.byId[x.id].onliner, 'сетап ' + x.id);
  assert.strictEqual(C.setupTarget('display', 1000), 250);
  assert.strictEqual(C.setupTarget('display', 100000), 3500);
});

test('объявление Kufar → материнская плата с характеристиками', async () => {
  const KC = require('../server/kufarCompat');
  const ad = { name: 'Материнская плата Asus Prime B650M-K AM5 DDR5', price: 250, params: { ccsct: { vl: 'AM5' }, ccrt: { vl: 'DDR5' }, ccff: { vl: 'mATX' }, ccns: { vl: '2' }, ccch: { vl: 'AMD B650' } } };
  const mb = await KC.enrich('motherboard', ad);
  assert.deepStrictEqual([mb.specs.socket, mb.specs.mem, mb.specs.form, mb.specs.chipset], ['AM5', 'DDR5', 'mATX', 'B650']);
  const guess = await KC.enrich('motherboard', { name: 'Gigabyte B760M DS3H DDR4', price: 200, params: {} });
  assert.deepStrictEqual([guess.specs.socket, guess.specs.mem, guess.specs.form], ['LGA1700', 'DDR4', 'mATX']);
  const ram = await KC.enrich('ram', { name: 'Kingston Fury 2x16GB DDR5 6000', price: 600, params: {} });
  assert.deepStrictEqual([ram.specs.type, ram.specs.totalGb, ram.specs.modules], ['DDR5', 32, 2]);
});

test('чипсет из объявления → сокет (AMD и Intel с похожими названиями)', async () => {
  const KC = require('../server/kufarCompat');
  const cases = [['asrock H81M-HDS', 'LGA1150'], ['Gigabyte B560M DS3H', 'LGA1200'], ['MSI B450M-A PRO MAX', 'AM4'], ['ASRock B360M-HDV', 'LGA1151'],
    ['MSI MAG B850 Tomahawk', 'AM5'], ['Asus Prime B860-Plus', 'LGA1851'], ['Asus TUF B650E-PLUS', 'AM5']];
  for (const [name, socket] of cases) {
    const mb = await KC.enrich('motherboard', { name, price: 200, params: {} });
    assert.strictEqual(mb.specs.socket, socket, name);
  }
  assert.strictEqual(KC.findChipset('Видеокарта RTX 5060'), null);
  const kase = await KC.enrich('case', { name: 'Корпус аквариум 3 RGB вентилятора', price: 100, params: {} });
  assert.strictEqual(kase.specs.fans, 3);
  const kase2 = await KC.enrich('case', { name: 'Корпус Zalman i3 Neo', price: 100, params: {} });
  assert.strictEqual(kase2.specs.fans, null);
});

console.log('Умный поиск');
test('запрос → раздел и фильтры: ssd 512 gb, ddr5 32gb, бп 750w gold, so-dimm, hdd 2тб, кулер am5', async () => {
  const Q = require('../server/query');
  const ssd = await Q.parse('ssd 512 gb');
  assert.strictEqual(ssd.section, 'ssd');
  assert.deepStrictEqual(ssd.filters.volume_hdd, { from: '480gb', to: '512gb' });
  assert.strictEqual(ssd.rest, '');
  const ram = await Q.parse('оперативка ddr5 2x16гб');
  assert.strictEqual(ram.section, 'dram');
  assert.deepStrictEqual([ram.filters.dramkit, ram.filters.volume_dram], [['ddr5dimm'], { from: '32gb', to: '32gb' }]);
  const psu = await Q.parse('бп 750w gold');
  assert.deepStrictEqual([psu.section, psu.filters.power_sup, psu.filters['80plus_conform']], ['powersupply', { from: 750 }, ['golden']]);
  const nb = await Q.parse('память для ноутбука ddr4 16гб');
  assert.deepStrictEqual([nb.section, nb.filters.dramkit], ['nb_ram', ['ddr4sodimm']]);
  const hdd = await Q.parse('жесткий диск 2тб');
  assert.deepStrictEqual([hdd.section, hdd.filters.volume_hdd], ['hdd', { from: '2tb', to: '2tb' }]);
  const fan = await Q.parse('кулер для am5');
  assert.deepStrictEqual([fan.section, fan.filters.fan_socket], ['fan', ['am5']]);
  const gpu = await Q.parse('rtx 4060ти');
  assert.deepStrictEqual([gpu.section, gpu.rest], ['videocard', 'rtx 4060 ti']);
  assert.strictEqual(await Q.parse('samsung 990 pro'), null);
});

console.log('Слежение');
test('слежение: снижение цены, цель и новые объявления Kufar', async () => {
  const os = require('os');
  const path = require('path');
  const store = require('../server/store');
  store.setDir(require('fs').mkdtempSync(path.join(os.tmpdir(), 'podbor-watch-')));
  const onliner = require('../server/providers/onliner');
  const kufar = require('../server/providers/kufar');
  const orig = { product: onliner.product, search: kufar.search };
  let price = 1000;
  const assessed = (name, description) => require('../server/kufarCondition').assess(name, description, true);
  const good = assessed('RTX 3060', 'В рабочем состоянии.');
  let ads = [{ id: '1', name: 'Видеокарта RTX 3060 12GB', price: 900, source: 'kufar', risk: good }];
  onliner.product = async () => ({ price });
  kufar.search = async () => ({ items: ads, total: ads.length });
  try {
    const W = require('../server/watch');
    W.start({ kufarOpts: () => ({}) });
    const got = [];
    const off = W.onEvent((e) => got.push(e.type));
    const item = W.addItem({ id: 'rtx3060', category: 'videocard', name: 'RTX 3060', price: 1000 });
    W.setTarget(item.id, 950);
    price = 940;
    await W.check({ force: true });
    assert.deepStrictEqual(got.sort(), ['price', 'target']);
    await W.addSearch({ cat: 'videocard', q: 'rtx 3060' });
    got.length = 0;
    const broken = assessed('RTX 3060', 'Вентиляторы крутятся, но нет картинки.');
    ads = [{ id: '9', name: 'RTX 3060', price: 100, source: 'kufar', risk: broken },
      { id: '2', name: 'RTX 3060 Palit', price: 850, source: 'kufar', risk: good }, ...ads];
    await W.check({ force: true });
    assert.deepStrictEqual(got, ['ads']);
    const sum = W.summary();
    assert.ok(sum.searches[0].latest.every((a) => a.id !== '9'));
    assert.strictEqual(sum.items[0].lastPrice, 940);
    assert.ok(sum.unread >= 3);
    off();
  } finally {
    onliner.product = orig.product;
    kufar.search = orig.search;
  }
});

console.log('Сетап');
test('класс монитора по мощности видеокарты', () => {
  const Setup = require('../server/setup');
  assert.deepStrictEqual(Setup.monitorClasses('gaming', 80, 600)[0], 'fhd144');
  assert.deepStrictEqual(Setup.monitorClasses('gaming', 150, 900)[0], 'qhd144');
  assert.deepStrictEqual(Setup.monitorClasses('gaming', 220, 2000)[0], 'qhd240');
  assert.deepStrictEqual(Setup.monitorClasses('office', 10, 400), ['office']);
});
test('выбор пунктов сетапа: монитор под видеокарту, игровые наушники для игрового ПК', () => {
  const Setup = require('../server/setup');
  const mon = (id, price, desc, rating = 45, reviews = 20) => ({ id, name: id, price, description: desc, rating: rating / 10, reviews, offers: 5, specs: parseSpecs('display', desc) });
  const pools = {
    display: [
      mon('fhd60', 300, '24", 1920x1080, 16:9, IPS, 75 Гц'),
      mon('fhd165', 420, '24", 1920x1080, 16:9, IPS, 165 Гц'),
      mon('qhd180', 700, '27", 2560x1440, 16:9, IPS, 180 Гц'),
    ],
    headphones: [
      { id: 'tws', name: 'TWS', price: 150, description: 'беспроводные, внутриканальные, TWS', rating: 4.9, reviews: 100, offers: 9 },
      { id: 'headset', name: 'Headset', price: 170, description: 'мониторные (охватывающие), геймерские', rating: 4.2, reviews: 10, offers: 4 },
    ],
  };
  const weak = Setup.choose(['display', 'headphones'], pools, 4000, 'gaming', 80);
  assert.strictEqual(weak.items.display.id, 'fhd165');
  assert.strictEqual(weak.items.headphones.id, 'headset');
  const strong = Setup.choose(['display'], pools, 6000, 'gaming', 160);
  assert.strictEqual(strong.items.display.id, 'qhd180');
  assert.ok(strong.total === 700);
});

console.log('Видеокарты');
test('типы, суффиксы и объёмы видеопамяти', () => {
  const models = [
    ['ASUS RTX 4070-Ti-SUPER 16GB', 'rtx4070tisuper'], ['RTX4070TiS', 'rtx4070tisuper'],
    ['MSI RTX 4070 Super', 'rtx4070super'], ['RX 7900-XT', 'rx7900xt'], ['RX 7900-XTX', 'rx7900xtx'],
    ['RX 7900-GRE', 'rx7900gre'], ['RTX 4060, не фейк, не мобильная', 'rtx4060'],
  ];
  for (const [name, key] of models) assert.strictEqual(perf.gpuKey(name), key, name);
  for (const name of ['RTX 4080 Ti', 'RTX 5090 D V2', 'RX 9060 XT LP', 'RX 580 2048SP']) {
    assert.strictEqual(perf.gpuKey(name), null, name);
  }
  for (const name of ['RTX 4090 Laptop GPU', 'RTX 3080M', 'RX 7600M XT', 'Arc A770M', 'RTX 4060 MXM']) {
    assert.strictEqual(perf.gpuModel(name).kind, 'mobile', name);
    assert.strictEqual(perf.gpuKey(name), null, name);
  }
  assert.strictEqual(perf.laptopGpuKey('GeForce RTX 4090 Laptop GPU'), 'rtx4090');
  assert.strictEqual(perf.gpuModel('NVIDIA CMP 30HX').kind, 'mining');
  assert.strictEqual(perf.gpuVram('RTX 4060 Ti 8/16 ГБ'), null);
  for (const key of ['rtx4060ti', 'rtx5060ti', 'rx9060xt', 'arca770']) {
    assert.notStrictEqual(perf.gpuPerf(key, 8).variantKey, perf.gpuPerf(key, 16).variantKey);
    assert.strictEqual(perf.gpuPerf(key).variantKey, null);
  }
});

test('Onliner: точные размеры, разъёмы, комплектация и характеристики БП', () => {
  const row = (k, v) => `<tr><td>${k}<!----></td><td>${v}</td></tr>`;
  const gpu = parseHardware('videocard', [
    row('Видеопамять', '16&nbsp;ГБ'), row('Длина видеокарты', '340&nbsp;мм'),
    row('Толщина видеокарты', '70 мм'), row('Толщина системы охлаждения', '3 слота'),
    row('Разъёмы питания', '16 pin (12V-2x6)'), row('Рекомендуемый блок питания', '850 Вт'),
    row('Комплектация', 'разветвитель 3 x 8-pin - 1 x 16-pin'),
  ].join(''));
  assert.deepStrictEqual(gpu, {
    vramGb: 16, lengthMm: 340, thicknessMm: 70, slots: 3, recommendedPsuWatts: 850,
    power: '16 pin (12v-2x6)', gpuInputs: { six: 0, eight: 0, sixteen: 1 }, adapter8: 3,
  });
  const psu = parseHardware('powersupply', [
    row('CPU 8 pin', '2'), row('PCIe 6 pin', '<span class="i-x"></span>'), row('PCIe 6+2 pin', '4'),
    row('PCIe 8 pin', '<span class="i-x"></span>'), row('PCIe Gen5', '1'),
  ].join(''));
  assert.deepStrictEqual(psu.gpuOutputs, { six: 0, flex: 4, eight: 0, sixteen: 1 });
  assert.deepStrictEqual(parseHardware('powersupply', row('CPU 8 pin', '2')), {});
  assert.deepStrictEqual(gpuConnectors('2 × 8-pin + 6 pin'), { six: 1, eight: 2, sixteen: 0 });
  assert.deepStrictEqual(gpuConnectors('6+2 pin'), { six: 0, eight: 1, sixteen: 0 });
  assert.deepStrictEqual(gpuConnectors('нет'), { six: 0, eight: 0, sixteen: 0 });
  const kase = parseHardware('chassis', [
    row('Макс. длина видеокарты', '345 мм'), row('Максимальная толщина видеокарты', '55,5 мм'),
    row('Горизонтальные слоты расширения', '3'), row('Вертикальные слоты расширения', '2'),
  ].join(''));
  assert.deepStrictEqual(kase, { gpuMaxMm: 345, gpuMaxThicknessMm: 55.5, expansionSlots: 3 });
});

test('совместимость: размеры, округление слотов и разъёмы важны даже при достаточной мощности', () => {
  const gpu = { specs: { lengthMm: 340, thicknessMm: 70, slots: 3.5, boardWatts: 310, recommendedPsuWatts: 850, gpuInputs: gpuConnectors('16-pin') } };
  const psu = { specs: { watts: 1000, gpuOutputs: { six: 0, eight: 0, flex: 2, sixteen: 0 } } };
  const kase = { specs: { gpuMaxMm: 320, gpuMaxThicknessMm: 65, expansionSlots: 3 } };
  const problems = Compat.check({ gpu, psu, case: kase }, {});
  assert.strictEqual(problems.filter((x) => x.level === 'error').length, 4);
  assert.strictEqual(Compat.psuNeed(null, gpu, 0).rec, 850);
  assert.strictEqual(Compat.gpuPower(gpu), 310);
  gpu.specs.adapter8 = 3;
  assert.strictEqual(Compat.checkGpuPower(gpu, psu).level, 'error');
  psu.specs.gpuOutputs.flex = 3;
  assert.strictEqual(Compat.checkGpuPower(gpu, psu).level, 'warn');
  psu.specs.gpuOutputs.sixteen = 1;
  assert.strictEqual(Compat.checkGpuPower(gpu, psu).level, 'ok');
  assert.strictEqual(Compat.checkGpuPower(gpu, { specs: { watts: 1000 } }).level, 'warn');
  assert.strictEqual(Compat.checkGpuPower({ specs: { gpuInputs: gpuConnectors('8+6 pin') } }, {
    specs: { gpuOutputs: { six: 0, eight: 0, flex: 1 } },
  }).level, 'error');
});

test('Kufar: мобильные карты, CMP, подделки, разные версии и слишком низкая цена', () => {
  const kufar = require('../server/providers/kufar');
  const market = require('../server/market');
  const make = (subject, body = 'Рабочая, проверена.', price = 900, vram = '8 ГБ') => kufar.normalize({
    subject, ad_id: 71, body, price_byn: String(price * 100),
    ad_parameters: [{ p: 'type', pu: 'cct', v: '11' }, { p: 'memory', pu: 'cdr', v: 1, vl: vram }],
  });
  for (const ad of [make('RTX 4090 Laptop'), make('CMP 30HX'), make('RTX 4060 фейк'),
    make('RTX 4060', 'Исправна, мобильный чип.'), make('RTX 4060', 'Это подделка.')]) {
    assert.strictEqual(kufar.risk(ad).level, 'blocked', ad.name);
    assert.strictEqual(kufar.adGpuKey(ad), null, ad.name);
  }
  assert.strictEqual(kufar.risk(make('RTX 4060, не фейк')).level, 'clear');
  assert.strictEqual(kufar.risk(make('RTX 4060', 'Рабочая, не на мобильном чипе.')).level, 'clear');
  assert.strictEqual(kufar.risk(make('RTX 4060 Ti 16GB')).level, 'caution');
  assert.strictEqual(kufar.risk(make('RTX 4060 Ti 8/16 ГБ')).level, 'caution');
  const clean = make('RTX 4060 Ti 16GB', 'Рабочая, проверена.', 900, '16 ГБ');
  const cheap = make('RTX 4060 Ti 8GB', 'Рабочая, проверена.', 80);
  const ranked = market.rankByValue([cheap, clean], 'videocard');
  assert.strictEqual(ranked[0], clean);
  assert.ok(cheap.gpuPriceRisk);
  assert.strictEqual(cheap.best, false);
  assert.notStrictEqual(cheap.perf.variantKey, clean.perf.variantKey);
  assert.strictEqual(market.annotateSame(ranked), null);
});

console.log('Оптимизатор (подставные данные)');
test('подбирает совместимую сборку и меняет БП после проверки разъёмов', async () => {
  const onliner = require('../server/providers/onliner');
  const mk = (category, name, price, description, extra = {}) => onliner.normalize({
    key: name.toLowerCase().replace(/\W+/g, '-'), full_name: name, schema: { key: category, name: category }, description,
    prices: { price_min: { amount: String(price) }, offers: { count: 5 } }, html_url: 'https://catalog.onliner.by/x/' + name, ...extra,
  });
  const fixtures = {
    cpu: [
      mk('cpu', 'AMD Ryzen 5 5600', 300, '2022 г, Vermeer (Zen 3), сокет AM4, 6 ядер, 12 потоков, частота 4.4/3.5 ГГц, кэш 3 МБ + 32 МБ, поддержка DDR4, TDP 65W, OEM (без коробки, без кулера)'),
      mk('cpu', 'AMD Ryzen 5 7500F', 450, '2023 г, Raphael (Zen 4), сокет AM5, 6 ядер, 12 потоков, частота 5/3.7 ГГц, кэш 6 МБ + 32 МБ, поддержка DDR5, TDP 65W, OEM (без коробки, без кулера)'),
    ],
    videocard: [
      mk('videocard', 'Palit GeForce RTX 4060 Dual', 1100, '8 ГБ GDDR6, 128 бит, питание 8 pin'),
      mk('videocard', 'Palit GeForce RTX 5070 GamingPro', 2600, '12 ГБ GDDR7, 192 бит, питание 16 pin'),
    ],
    motherboard: [
      mk('motherboard', 'Gigabyte B550M DS3H', 260, 'mATX, сокет AMD AM4, чипсет AMD B550, память 4xDDR4, слоты: 1xPCIe x16 4.0, 2xM.2'),
      mk('motherboard', 'ASRock B650M-HDV/M.2', 330, 'mATX, сокет AMD AM5, чипсет AMD B650, память 2xDDR5, слоты: 1xPCIe x16 4.0, 2xM.2'),
    ],
    dram: [
      mk('dram', 'Kingston Fury 2x8GB DDR4 3200', 200, '16 ГБ, 2 модуля DDR4 DIMM по 8 ГБ, частота 3200 МГц, CL 16T'),
      mk('dram', 'Kingston Fury 2x16GB DDR5 6000', 600, '32 ГБ, 2 модуля DDR5 DIMM по 16 ГБ, частота 6000 МГц, CL 36T'),
      mk('dram', 'Kingston Fury 2x8GB DDR5 5600', 350, '16 ГБ, 2 модуля DDR5 DIMM по 8 ГБ, частота 5600 МГц, CL 36T'),
    ],
    ssd: [mk('ssd', 'Kingston NV3 1TB', 200, '1 ТБ, M.2 2280, PCI Express 4.0 x4, последовательный доступ: 6000/4000 МБайт/с')],
    powersupply: [
      mk('powersupply', 'DeepCool PK550D', 150, 'ATX 550 Вт, бронзовый сертификат 80 Plus'),
      mk('powersupply', 'DeepCool PK750D', 220, 'ATX 750 Вт, бронзовый сертификат 80 Plus'),
    ],
    chassis: [mk('chassis', 'Zalman i3', 150, 'Mid Tower, БП отсутствует, для плат ATX/micro-ATX/mini-ITX, с 4 вентиляторами в комплекте')],
    fan: [mk('fan', 'ID-Cooling SE-224-XTS', 60, 'рассеивание до 220 Вт, высота 154 мм, вентилятор 120 мм')],
  };
  // Подменяем загрузку из сети на подставные данные
  const originalHardware = onliner.enrichHardware;
  onliner.category = async (schema) => ({ items: fixtures[schema] || [], total: (fixtures[schema] || []).length });
  const checked = new Set();
  onliner.enrichHardware = async (it) => {
    if (it?.category === 'powersupply') {
      checked.add(it.specs.watts);
      it.specs.gpuOutputs = { six: 0, eight: 0, flex: it.specs.watts === 550 ? 0 : 2, sixteen: 0 };
    }
    return it;
  };
  const builder = require('../server/builder');
  try {
    const r = await builder.build({ budgetByn: 3000, purpose: 'gaming' });
    const v = r.variants.find((x) => x.id === 'optimal');
    assert.ok(v.build, 'сборка найдена');
    const p = v.build.parts;
    assert.ok(v.build.total <= 3000, 'в бюджете: ' + v.build.total);
    assert.strictEqual(p.cpu.specs.socket, p.motherboard.specs.socket);
    assert.strictEqual(p.ram.specs.type, p.motherboard.specs.mem);
    assert.ok(p.gpu, 'для игр есть видеокарта');
    assert.strictEqual(p.psu.specs.watts, 750);
    assert.deepStrictEqual([...checked].sort(), [550, 750]);
    assert.ok(p.cooler, 'OEM-процессору нужен кулер');
    assert.ok(!v.build.checks.some((c) => c.level === 'error'), 'без ошибок совместимости');
    console.log(`    → ${p.cpu.name} + ${p.gpu.name}, итого ${v.build.total} р.`);
  } finally {
    onliner.enrichHardware = originalHardware;
  }
});

test('отзывы: плюсы, минусы, отрицания и пересказ чужих слов', () => {
  const reviews = require('../server/reviews');
  const t1 = reviews.topicsOf({ rating: 5, pros: 'Тихая, холодная', cons: 'Писка дросселей нет', text: '' }, 'videocard');
  assert.strictEqual(t1.get('quiet'), 1);
  assert.strictEqual(t1.get('temp'), 1);
  assert.strictEqual(t1.get('coil'), 1, '«писка нет» — это плюс');
  const t2 = reviews.topicsOf({ rating: 3, pros: 'Производительность', cons: 'Треск дросселей под нагрузкой', text: '' }, 'videocard');
  assert.strictEqual(t2.get('coil'), -1);
  // В пятизвёздочном отзыве «друзья пугали писком дросселей» — не жалоба
  const t3 = reviews.topicsOf({ rating: 5, pros: '', cons: 'Не обнаружил', text: 'Друзья отговаривали: писк дросселей, вылетает. Всё отлично.' }, 'videocard');
  assert.ok(!t3.has('coil') || t3.get('coil') > 0);
  // Писк дросселей у SSD не ищем
  assert.ok(!reviews.topicsOf({ rating: 2, cons: 'писк', pros: '' }, 'ssd').has('coil'));
  const s = reviews.summarize([{ rating: 5, pros: 'тихая', cons: '' }, { rating: 4, pros: 'тихая, мощная', cons: 'дорогая' }], 4.5, 2, 'videocard');
  assert.strictEqual(s.pros[0].id, 'quiet');
  assert.ok(/Отзывов мало/.test(s.verdict.text));
});

test('Kufar «сначала выгодные»: устаревшее и «куплю» — вниз, комплект 2x8 — не «несколько вариантов»', () => {
  const market = require('../server/market');
  const gpu = market.rankByValue([
    { name: 'Куплю RTX 3070', price: 100 }, { name: 'RX 580 8GB', price: 140 }, { name: 'Palit RTX 3070 8GB', price: 1100 }, { name: 'Видеокарта', price: 50 },
  ], 'videocard').map((x) => x.name);
  assert.strictEqual(gpu[0], 'Palit RTX 3070 8GB');
  assert.strictEqual(gpu[gpu.length - 1], 'Куплю RTX 3070');
  const ram = market.rankByValue([
    { name: 'DDR3 8GB 1600', price: 20 }, { name: 'Kingston Fury 2x8GB DDR4 3200', price: 90 }, { name: 'DDR4 8/16/32 GB', price: 60 },
  ], 'dram').map((x) => x.name);
  assert.strictEqual(ram[0], 'Kingston Fury 2x8GB DDR4 3200');
  assert.strictEqual(ram[ram.length - 1], 'DDR4 8/16/32 GB');
});

test('ИИ-поиск: продолжение после pause_turn, цитаты → источники [n], отказ модели', async () => {
  const store = require('../server/store');
  const os = require('os');
  const path = require('path');
  store.setDir(require('fs').mkdtempSync(path.join(os.tmpdir(), 'podbor-ai-')));
  require('../server/secrets').set({ anthropicKey: 'sk-ant-test' });
  const ai = require('../server/ai');
  const calls = [];
  const replies = [
    { stop_reason: 'pause_turn', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 }, content: [
      { type: 'server_tool_use', name: 'web_search', id: 's1', input: { query: 'x' } },
      { type: 'web_search_tool_result', tool_use_id: 's1', content: [{ type: 'web_search_result', url: 'https://forum.example/a', title: 'Тема A' }, { type: 'web_search_result', url: 'https://example.org/b', title: 'B' }] },
    ] },
    { stop_reason: 'end_turn', model: 'claude-opus-5-5', usage: { input_tokens: 2, output_tokens: 3 }, content: [
      { type: 'text', text: '## Коротко\nКарта тихая', citations: [{ type: 'web_search_result_location', url: 'https://forum.example/a', title: 'Тема A', cited_text: '...' }] },
      { type: 'text', text: '.\n- Писк дросселей бывает', citations: [{ url: 'https://forum.example/a', title: 'Тема A' }, { url: 'https://x.example/c', title: 'C' }] },
    ] },
  ];
  ai._setClientForTests({ beta: { messages: { stream: (params) => { calls.push(params); const r = replies.shift(); return { finalMessage: async () => r }; } } } });
  const r = await ai.research('RTX 5070', { mode: 'part' });
  assert.strictEqual(calls.length, 2, 'после pause_turn — повторный запрос');
  assert.strictEqual(calls[1].messages.length, 2, 'повтор без лишнего сообщения «продолжи»');
  assert.strictEqual(calls[0].fallbacks, 'default');
  assert.ok(calls[0].tools.some((t) => t.type === 'web_search_20260209'));
  assert.ok(/Карта тихая\[1\]/.test(r.text), r.text);
  assert.ok(/\[1\]\[2\]$/.test(r.text), r.text);
  assert.deepStrictEqual(r.sources.map((x) => x.url), ['https://forum.example/a', 'https://x.example/c']);
  assert.deepStrictEqual(r.more.map((x) => x.url), ['https://example.org/b']);
  assert.strictEqual(r.searches, 1);
  ai._setClientForTests({ beta: { messages: { stream: () => ({ finalMessage: async () => ({ stop_reason: 'refusal', content: [], usage: {} }) }) } } });
  await assert.rejects(() => ai.research('x', { mode: 'free' }), /отказалась/);
});

test('умный поиск: слово в запросе важнее открытого раздела', async () => {
  const query = require('../server/query');
  assert.strictEqual((await query.parse('ноутбук игровой', 'videocard')).section, 'notebook');
  assert.strictEqual((await query.parse('rtx 5070', 'videocard')).section, 'videocard');
  assert.strictEqual((await query.parse('ddr5 32gb', 'nb_ram')).section, 'nb_ram', 'в разделе SO-DIMM «ddr5» не уводит в память для ПК');
  assert.strictEqual((await query.parse('so-dimm 16', 'dram')).section, 'nb_ram');
});

test('Kufar «выгодные» для блоков питания: ватты за рубль, списки моделей и кабели — вниз', () => {
  const market = require('../server/market');
  const r = market.rankByValue([
    { name: 'Блок питания 1stPlayer FK 600W, 650W, 700W, 750W', price: 85 }, { name: 'Кабель питания', price: 5 },
    { name: 'Corsair RM850x Gold', price: 300 }, { name: 'Блок питания Chieftec 600 Вт', price: 90 },
  ], 'powersupply').map((x) => x.name);
  assert.deepStrictEqual(r.slice(0, 2).sort(), ['Corsair RM850x Gold', 'Блок питания Chieftec 600 Вт'].sort());
  assert.strictEqual(r[r.length - 1], 'Кабель питания');
});

test('локальная модель (Ollama/LM Studio): поиск модели, выжимка по материалам [n], разбор отзывов JSON, скачивание', async () => {
  // Ждём предыдущие тесты: они ставят ключ Anthropic в общее хранилище
  await Promise.all(pending.slice());
  const http = require('http');
  const llm = require('../server/llm');
  const aiLocal = require('../server/aiLocal');
  const ai = require('../server/ai');
  const secrets = require('../server/secrets');
  const seen = [];
  let thinkUnsupported = true;
  const ollama = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const body = b ? JSON.parse(b) : null;
      seen.push({ path: req.url, body });
      const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.url === '/api/tags') return json(200, { models: [{ name: 'qwen3:8b', size: 5.2e9 }] });
      if (req.url === '/api/pull') {
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        res.write(JSON.stringify({ status: 'pulling manifest' }) + '\n');
        res.write(JSON.stringify({ status: 'downloading', total: 100, completed: 40 }) + '\n');
        return res.end(JSON.stringify({ status: 'success' }) + '\n');
      }
      if (req.url === '/api/chat') {
        if (body.think !== undefined && thinkUnsupported) return json(400, { error: '"qwen3:8b" does not support thinking' });
        if (body.format) return json(200, { message: { content: '```json\n{"verdict":"Хорошая тихая карта","pros":["тихая"],"cons":["греется"],"who":"для FullHD","warnings":[]}\n```' }, prompt_eval_count: 10, eval_count: 5 });
        return json(200, { message: { content: '<think>думаю…</think>## Коротко\nКарта тихая [1], но бывает писк [2].' }, prompt_eval_count: 100, eval_count: 20 });
      }
      json(404, { error: 'not found' });
    });
  });
  const lmstudio = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const body = b ? JSON.parse(b) : null;
      const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.url === '/v1/models') return json(200, { data: [{ id: 'local-model' }] });
      if (req.url === '/v1/chat/completions') {
        if (body.response_format) return json(400, { error: { message: 'response_format not supported' } });
        return json(200, { model: 'local-model', choices: [{ message: { content: 'Вот ответ: {"verdict":"Норм","pros":"тихая","cons":[],"who":"всем","warnings":[]}' } }], usage: { prompt_tokens: 7, completion_tokens: 3 } });
      }
      json(404, { error: 'not found' });
    });
  });
  await new Promise((r) => ollama.listen(0, '127.0.0.1', r));
  await new Promise((r) => lmstudio.listen(0, '127.0.0.1', r));
  const oUrl = `http://127.0.0.1:${ollama.address().port}`;
  const lUrl = `http://127.0.0.1:${lmstudio.address().port}/v1/`;
  const news = require('../server/news');
  const onliner = require('../server/providers/onliner');
  const reviews = require('../server/reviews');
  const orig = { s: news.searchArticles, o: onliner.search, r: reviews.forProduct };
  try {
    // Что за программа по адресу
    const p1 = await llm.probe(oUrl);
    assert.strictEqual(p1.kind, 'ollama');
    assert.deepStrictEqual(p1.models.map((m) => m.id), ['qwen3:8b']);
    const p2 = await llm.probe(lUrl);
    assert.strictEqual(p2.kind, 'openai');
    assert.strictEqual(p2.url, lUrl.replace(/\/v1\/$/, ''), 'адрес без /v1');
    await assert.rejects(() => llm.probe('http://127.0.0.1:1'), /не отвечает/);

    assert.deepStrictEqual(aiLocal.shortQueries('Видеокарта Gigabyte GeForce RTX 4060 Eagle OC 8GB'), ['rtx 4060', '4060']);

    // Без ключа Anthropic, с локальной моделью — ИИ доступен и отвечает локальная
    secrets.set({ anthropicKey: '', llmUrl: oUrl, llmModel: 'qwen3:8b', llmKind: 'ollama' });
    assert.strictEqual(ai.engine(), 'local');
    assert.strictEqual(ai.modelLabel(), 'qwen3:8b');

    news.searchArticles = async () => ({ items: [
      { link: 'https://example.org/review-4060', title: 'Обзор RTX 4060', sourceName: 'Пример', summary: 'Карта тихая и холодная, в FullHD тянет всё. '.repeat(3) },
      { link: 'https://example.org/forum-4060', title: 'Писк дросселей у 4060', sourceName: 'Форум', summary: 'У некоторых владельцев пищат дроссели под нагрузкой. '.repeat(3) },
    ] });
    onliner.search = async () => ({ items: [{ id: 'rtx4060eagle', name: 'Gigabyte GeForce RTX 4060 Eagle OC 8GB', reviews: 3, category: 'videocard', url: 'https://catalog.onliner.by/videocard/gigabyte/rtx4060eagle' }] });
    reviews.forProduct = async () => ({ total: 3, rating: 4.7, items: [{ rating: 5, summary: 'Тихая', pros: 'тихая', cons: 'нет', text: 'Отличная карта' }] });

    const r = await ai.research('Gigabyte GeForce RTX 4060 Eagle OC 8GB', { mode: 'part' });
    assert.strictEqual(r.engine, 'local');
    assert.ok(!/think|думаю/.test(r.text), 'размышления модели убраны');
    assert.ok(/Карта тихая \[1\]/.test(r.text), r.text);
    assert.strictEqual(r.searches, 3, 'отзывы Onliner + 2 статьи');
    assert.deepStrictEqual(r.sources.map((s) => s.n), [1, 2], 'источники — те, на которые сослалась модель');
    assert.ok(/Отзывы покупателей Onliner/.test(r.sources[0].title), r.sources[0].title);
    assert.strictEqual(r.more.length, 1);
    const chats = seen.filter((x) => x.path === '/api/chat');
    assert.strictEqual(chats.length, 2, 'повтор без think после ошибки');
    assert.strictEqual(chats[1].body.think, undefined);
    assert.strictEqual(chats[1].body.options.num_ctx, 8192);
    assert.ok(/\[1\] Отзывы покупателей Onliner/.test(chats[1].body.messages[1].content), 'материалы пронумерованы');

    // Разбор отзывов: JSON-схема в format, ответ в ```json``` всё равно разбирается
    const sum = await ai.reviewSummary('RTX 4060', [{ rating: 5, summary: 'Тихая', pros: 'тихая', cons: 'греется', text: 'ok' }]);
    assert.strictEqual(sum.verdict, 'Хорошая тихая карта');
    assert.deepStrictEqual(sum.cons, ['греется']);
    assert.ok(seen.some((x) => x.path === '/api/chat' && x.body.format && x.body.format.required.includes('verdict')));

    // OpenAI-совместимый (LM Studio): без response_format — повтор, JSON достаётся из текста
    secrets.set({ llmUrl: lUrl, llmModel: 'local-model', llmKind: 'openai' });
    const sum2 = await ai.reviewSummary('RTX 4060', [{ rating: 4, summary: 'ok' }]);
    assert.strictEqual(sum2.verdict, 'Норм');
    assert.deepStrictEqual(sum2.pros, ['тихая'], 'строка вместо списка → список');

    // Скачивание модели с прогрессом
    const prog = [];
    await llm.pull(oUrl, 'qwen3:4b', (x) => prog.push(x));
    assert.ok(prog.some((x) => x.total === 100 && x.completed === 40));
    assert.strictEqual(prog[prog.length - 1].status, 'success');

    // Отключили модель — ИИ снова недоступен
    secrets.set({ llmModel: '' });
    assert.strictEqual(ai.engine(), null);
    thinkUnsupported = false;
  } finally {
    news.searchArticles = orig.s;
    onliner.search = orig.o;
    reviews.forProduct = orig.r;
    ollama.close();
    lmstudio.close();
  }
});

test('OpenAI и DeepSeek: проверка подключения, смена модели, отдельные ключи и кэш', async () => {
  await Promise.all(pending.slice());
  const store = require('../server/store');
  const secrets = require('../server/secrets');
  const ai = require('../server/ai');
  const { createServer } = require('../server/server');
  const previousDir = store.dataDir();
  store.flush();
  store.setDir(require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'podbor-providers-')));
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const fetch = global.fetch;
  const sent = [];
  global.fetch = async (url, init) => {
    const { origin, pathname } = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    sent.push({ origin, pathname, body, key: init.headers.Authorization, redirect: init.redirect });
    if (init.headers.Authorization === 'Bearer invalid') return Response.json({ error: 'bad key' }, { status: 401 });
    if (pathname.endsWith('/models')) return Response.json({ data: [{ id: 'deepseek-flash' }] });
    const content = body?.response_format ? '{"verdict":"Тихая","pros":[],"cons":[],"who":"","warnings":[]}' : 'OK';
    return Response.json({ model: body?.model, choices: [{ message: { content } }] });
  };
  const api = async (pathname, body) => {
    const init = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined;
    const r = await fetch(baseUrl + pathname, init);
    return { status: r.status, data: await r.json() };
  };
  const provider = (id, data, action = 'connect') => api('/api/ai/provider', { provider: id, action, ...data });
  try {
    secrets.set({ anthropicKey: 'old-claude-key', llmUrl: 'http://localhost:1234/v1', llmModel: 'old-local-model', llmKind: 'openai' });
    assert.strictEqual(ai.engine(), 'anthropic', 'старые настройки сохраняют приоритет Claude');
    const connected = await provider('openai', { key: 'openai-test-key', url: 'https://ignored.example' });
    assert.strictEqual(connected.status, 200);
    assert.strictEqual(connected.data.ai.active, 'openai');
    assert.ok(!JSON.stringify(connected.data).includes('openai-test-key'));
    assert.strictEqual(secrets.get('anthropicKey'), 'old-claude-key');
    assert.strictEqual(secrets.providerProfile('lmstudio').model, 'old-local-model');
    const openaiReq = sent.at(-1);
    assert.strictEqual(openaiReq.origin, 'https://api.openai.com');
    assert.strictEqual(openaiReq.pathname, '/v1/chat/completions');
    assert.strictEqual(openaiReq.key, 'Bearer openai-test-key');
    assert.strictEqual(openaiReq.redirect, 'error');
    assert.strictEqual(openaiReq.body.max_completion_tokens, 128);
    assert.ok(!('max_tokens' in openaiReq.body) && !('temperature' in openaiReq.body));
    const status = (await api('/api/ai/status')).data;
    assert.strictEqual(status.via.ai, 'cloud');
    assert.strictEqual(status.model, 'gpt-6-luna');
    const scope = ai.cacheScope();
    const query = 'RTX 4060';
    const req = { query, mode: 'part', depth: 'quick', cachedOnly: true };
    const saved = { text: 'Ответ OpenAI' };
    store.set('aiHistory', [{ key: JSON.stringify([scope, 'part', 'quick', query.toLowerCase()]), t: Date.now(), result: saved }]);
    assert.strictEqual((await api('/api/ai/research', req)).data.text, saved.text);
    assert.strictEqual((await provider('deepseek', {})).status, 400, 'чужой ключ не берётся');
    assert.strictEqual((await provider('deepseek', { key: 'invalid' })).status, 400);
    assert.strictEqual(ai.modelLabel(), 'gpt-6-luna', 'неудачная проверка сохраняет активную модель');
    const models = await provider('deepseek', { key: 'deepseek-test-key' }, 'models');
    assert.deepStrictEqual(models.data.models.map((m) => m.id), ['deepseek-flash']);
    assert.strictEqual(sent.at(-1).pathname, '/models');
    assert.strictEqual((await provider('deepseek', { key: 'deepseek-test-key' })).status, 200);
    assert.strictEqual(sent.at(-1).origin, 'https://api.deepseek.com');
    assert.strictEqual(sent.at(-1).pathname, '/chat/completions');
    assert.deepStrictEqual(sent.at(-1).body.thinking, { type: 'disabled' });
    const requests = sent.length;
    assert.deepStrictEqual((await api('/api/ai/research', req)).data, { cached: false });
    assert.strictEqual(sent.length, requests, 'открытие карточки не вызывает новый запрос');
    const summary = await ai.reviewSummary(query, [{ summary: 'Тихая' }]);
    assert.strictEqual(summary.verdict, 'Тихая');
    assert.strictEqual(summary.cloud, true);
    assert.deepStrictEqual(sent.at(-1).body.response_format, { type: 'json_object' });
    assert.strictEqual((await provider('openai', {})).status, 200);
    assert.strictEqual(sent.at(-1).key, 'Bearer openai-test-key');
    assert.strictEqual((await provider('server', {})).status, 200);
    assert.strictEqual(ai.engine(), null);
  } finally {
    global.fetch = fetch;
    await new Promise((resolve) => server.close(resolve));
    store.flush();
    store.setDir(previousDir);
  }
});

test('совместимый адрес: сохранённый ключ используется только с тем же адресом', async () => {
  await Promise.all(pending.slice());
  const store = require('../server/store');
  const secrets = require('../server/secrets');
  const llm = require('../server/llm');
  const previousDir = store.dataDir();
  store.setDir(require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'podbor-key-')));
  try {
    secrets.saveProvider('custom', { url: 'https://one.example', model: 'demo', key: 'custom-test-key' });
    assert.strictEqual(llm.providerConfig('custom', { url: 'https://one.example/v1/' }).key, 'custom-test-key');
    assert.strictEqual(llm.providerConfig('custom', { url: 'https://two.example/v1/' }).key, '');
    assert.throws(() => llm.providerConfig('custom', { url: 'http://two.example', key: 'custom-test-key' }), /HTTPS/);
    assert.throws(() => llm.providerConfig('custom', { url: 'https://name:pass@one.example' }), /без логина/);
    secrets.removeProvider('custom');
    assert.strictEqual(secrets.activeProvider(), 'server');
    assert.deepStrictEqual(secrets.providerProfile('custom'), {});
  } finally {
    store.flush();
    store.setDir(previousDir);
  }
});

test('ИИ-помощник сборки: реальные позиции, общая цена, совместимость и подсказка без провайдера', async () => {
  await Promise.all(pending.slice());
  const store = require('../server/store');
  const secrets = require('../server/secrets');
  const ai = require('../server/ai');
  const onliner = require('../server/providers/onliner');
  const { createServer } = require('../server/server');
  const previousDir = store.dataDir();
  store.flush();
  store.setDir(require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'podbor-build-advice-')));
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/ai/build-advice`;
  const item = (id, category, price, specs, perf) => ({ source: 'onliner', id, name: id, category, price, specs, perf });
  const parts = {
    cpu: item('cpu-am5', 'cpu', 400, { socket: 'AM5', mem: ['DDR5'], tdp: 65, withCooler: true, hasIgpu: true }, { gaming: 130, multi: 150, igpu: 15 }),
    motherboard: item('board-am5', 'motherboard', 200, { socket: 'AM5', mem: 'DDR5', chipset: 'B650', memSlots: 4 }),
    ram: item('ram-current', 'dram', 80, { type: 'DDR5', form: 'DIMM', totalGb: 8, modules: 1 }),
    psu: item('psu-current', 'powersupply', 150, {}),
    case: item('case-current', 'chassis', 100, {}),
  };
  parts.cpu.url = 'https://example.org/private-link';
  const products = {
    good: item('good', 'dram', 120, { type: 'DDR5', form: 'DIMM', totalGb: 32, modules: 2 }),
    wrongMemory: item('wrongMemory', 'dram', 110, { type: 'DDR4', form: 'DIMM', totalGb: 32, modules: 2 }),
    expensive: item('expensive', 'dram', 200, { type: 'DDR5', form: 'DIMM', totalGb: 64, modules: 2 }),
    noStock: item('noStock', 'dram', null, { type: 'DDR5', form: 'DIMM' }),
    wrongSocket: item('wrongSocket', 'cpu', 410, { socket: 'AM4', mem: ['DDR4'] }),
  };
  const body = { parts, have: { gpu: true }, purpose: 'work', setup: { display: { price: 200 } }, budget: 1200,
    alternatives: { ram: ['wrongMemory', 'good', 'expensive', 'noStock'], cpu: ['wrongSocket'] } };
  const send = async () => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, data: await r.json() };
  };
  const original = { product: onliner.product, categoryPage: onliner.categoryPage };
  const input = [];
  let priceChecks = 0;
  onliner.product = async (id) => { priceChecks++; return products[id] || null; };
  onliner.categoryPage = async () => ({ items: [] });
  try {
    assert.strictEqual((await send()).status, 503);
    assert.strictEqual(priceChecks, 0);
    secrets.set({ anthropicKey: 'test-build-advice' });
    ai._setClientForTests({ beta: { messages: { create: async (req) => {
      input.push(JSON.parse(req.messages[0].content));
      return { model: 'test-model', stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 },
        content: [{ type: 'text', text: JSON.stringify({
          findings: ['f1', 'f999'], choices: ['c999', 'c1', 'c1', 'вымышленная деталь'], extra: 'Вставить вымышленную VR-карту',
        }) }] };
    } } } });
    const r = await send();
    assert.strictEqual(r.status, 200, JSON.stringify(r.data));
    assert.strictEqual(r.data.model, 'test-model');
    assert.strictEqual(r.data.total, 1130);
    assert.ok(r.data.findings.some((f) => /памят/i.test(f.text)));
    assert.deepStrictEqual(input[0].candidates.map((x) => x.name), ['good']);
    assert.ok(!JSON.stringify(input[0]).includes('private-link'));
    assert.deepStrictEqual(r.data.suggestions.map((s) => s.item.id), ['good']);
    assert.strictEqual(r.data.suggestions[0].cost, 1170);
    assert.ok(r.data.suggestions[0].warnings.some((s) => s.includes('блока питания')));
    assert.ok(!JSON.stringify(r.data).includes('вымышленн'));
    body.provider = 'deepseek';
    assert.strictEqual((await send()).status, 409);
    delete body.provider;
    parts.ram.price = null;
    const incomplete = await send();
    assert.strictEqual(incomplete.status, 200);
    assert.strictEqual(incomplete.data.missingPrice, true);
    assert.deepStrictEqual(incomplete.data.suggestions, []);
    assert.ok(incomplete.data.findings.some((f) => f.text.includes('нет цены')));
  } finally {
    Object.assign(onliner, original);
    await new Promise((resolve) => server.close(resolve));
    store.flush();
    store.setDir(previousDir);
  }
});

test('Kufar: явные дефекты, опечатки, отрицания и контекст', () => {
  const { assess } = require('../server/kufarCondition');
  const examples = [
    // Фрагменты описаний Kufar: item/1094690014, item/1083769765, item/1083096605, item/1093132953.
    ['GT 9600', 'работает но артефакты вертикальные', 'blocked'],
    ['GTX 1060', 'при долгой нагрузке изредка могут появляться артефакты', 'blocked'],
    ['RTX 3060', 'не майнила, не грелась, не разбиралась, артефактов нет', 'clear'],
    ['GTX 670', 'под нагрузкой артефакты, на запчасти', 'blocked'],
    ['RTX 4060', 'Рабочая, проверена. Без дефектов и артефактов.', 'clear'],
    ['RTX 4060', 'Артефактов, перегревов и глюков нет.', 'clear'],
    ['RTX 4060', 'Артефактов/перегревов нет.', 'clear'],
    ['Комплект 2x8GB DDR4', 'Проверено на ошибки, дефектов не наблюдается.', 'clear'],
    ['RTX 4060', 'Не работала до ремонта. После ремонта проверена.', 'caution'],
    ['RTX 3070', 'Работает, после маининга, тесты прошла.', 'caution'],
    ['RTX 3070', 'Без артефактов. Не майнила. Ремонтировалась.', 'caution'],
    ['GTX 1060', 'Не вклучается, вентиляторы крутятся.', 'blocked'],
    ['RTX 3060', 'Запускается, но нет картинки.', 'blocked'],
    ['RTX 3060', 'Не даёт изображения. Чип отвалился.', 'blocked'],
    ['RTX 3060', 'Никаких следов ремонта, но чип отвалился.', 'blocked'],
    ['RTX 3060', 'Возможно артефакты, проверить нечем.', 'caution'],
    ['RTX 3060', 'Рабочая. Иногда глючит подсветка.', 'caution'],
    ['RTX 4060', 'HDMI не работает. Через DisplayPort всё хорошо.', 'caution'],
    ['Материнская плата', 'Не работает с DDR4, стабильно работает с DDR5.', 'clear'],
    ['RTX 4060', 'Для компьютера. Не для майнинга. Продаю, потому что обновился.', 'clear'],
    ['RTX 4060', 'В нормальном состоянии. Если не работает, можно вернуть.', 'caution'],
    ['RTX 4060', '<p>Без дефектов</p><p>&#x43D;е запускается</p>', 'blocked'],
  ];
  for (const [title, body, expected] of examples) assert.strictEqual(assess(title, body, true).level, expected, title + ' / ' + body);
  assert.deepStrictEqual(assess('RTX 4060', '', true).level, 'unknown');
  assert.strictEqual(assess('RTX 4060', '', false).confidence, 'low');
  assert.strictEqual(assess('RTX 4060 на запчасти').confidence, 'high');
});

test('Kufar: полные описания, кэш, выдача, сборка и добровольная проверка ИИ', async () => {
  await Promise.all(pending.slice());
  const store = require('../server/store');
  const secrets = require('../server/secrets');
  const ai = require('../server/ai');
  const kufar = require('../server/providers/kufar');
  const market = require('../server/market');
  const { _internal: builder } = require('../server/builder');
  const { createServer } = require('../server/server');
  const previousDir = store.dataDir();
  store.flush();
  store.setDir(require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'podbor-kufar-check-')));
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const local = `http://127.0.0.1:${server.address().port}`;
  const fixtures = [
    ['95070001', 100, 'Без изображения, вентиляторы крутятся.'],
    ['95070002', 500, 'После майнинга. Состояние рабочее. Пишите user@example.com, +375 (29) 111-22-33 или https://example.com/chat'],
    ['95070003', 600, 'Не майнила, артефактов нет.'],
    ['95070004', 620, 'Рабочая, проверена. Без дефектов.'],
    ['95070005', 640, 'Исправна, можно проверить.'],
    ['95070006', 110, ''],
  ];
  const entry = (id, price, body) => ({ ad_id: id, price_byn: String(price * 100), subject: 'Palit RTX 4060', body, body_short: '', ad_parameters: [] });
  const fetchReal = global.fetch;
  const fetched = new Map();
  global.fetch = async (url, init) => {
    const adr = new URL(url);
    if (adr.origin === local) return fetchReal(url, init);
    if (adr.hostname !== 'api.kufar.by') return Response.json({}, { status: 404 });
    const match = adr.pathname.match(/\/item\/(\d+)\/rendered$/);
    if (!match) return Response.json({ ads: fixtures.map(([id, price]) => entry(id, price, '')), total: fixtures.length });
    const id = match[1];
    fetched.set(id, (fetched.get(id) || 0) + 1);
    const ad = fixtures.find((x) => x[0] === id);
    return ad ? Response.json({ result: entry(...ad) }) : Response.json({}, { status: 404 });
  };
  const api = async (path, body) => {
    const req = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined;
    const r = await fetchReal(local + path, req);
    return { status: r.status, data: await r.json() };
  };
  const prompts = [];
  try {
    const searched = await api('/api/search?src=kufar&q=rtx%204060&sort=price_asc');
    assert.strictEqual(searched.status, 200);
    assert.deepStrictEqual(searched.data.items.map((a) => a.risk.level), ['clear', 'clear', 'clear', 'unknown', 'caution', 'blocked']);
    assert.ok(searched.data.items.every((ad) => ad.description === undefined));
    assert.strictEqual(market.annotateSame(searched.data.items).median, 620);
    assert.ok(searched.data.items.filter((a) => a.risk.level !== 'clear').every((ad) => !ad.market));
    assert.strictEqual((await api('/api/kufar/enrich', { slot: 'gpu', item: { id: fixtures[0][0], name: 'RTX 4060' } })).status, 400);

    const gpus = [{ name: 'Palit RTX 4060', perf: { key: 'rtx4060', score: 100 }, specs: {} }];
    const eligible = await builder.kufarUsedParts('gpu', { gpus }, {}, 1800);
    assert.deepStrictEqual(eligible.map((x) => x.id), ['kufar-95070003', 'kufar-95070004']);

    secrets.set({ anthropicKey: 'test-kufar-advice' });
    ai._setClientForTests({ beta: { messages: { create: async (req) => {
      prompts.push(req.messages[0].content);
      return { model: 'test-kufar', stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 },
        content: [{ type: 'text', text: '{"verdict":"seller_reports_working"}' }] };
    } } } });
    const cautious = await api('/api/kufar/check', { id: fixtures[1][0] });
    assert.strictEqual(cautious.data.risk.level, 'caution');
    assert.strictEqual(prompts.length, 0);
    const blocked = await api('/api/kufar/check', { id: fixtures[0][0], ai: true });
    assert.strictEqual(blocked.data.risk.level, 'blocked');
    assert.strictEqual(prompts.length, 0);
    const review = await api('/api/kufar/check', { id: fixtures[1][0], ai: true });
    assert.strictEqual(review.data.risk.level, 'caution');
    assert.strictEqual(review.data.review.verdict, 'seller_reports_working');
    assert.strictEqual(prompts.length, 1);
    assert.ok(!/375|example/.test(prompts[0]));
    assert.ok(fixtures.every(([id]) => fetched.get(id) === 1));
    const sorted = market.rankByValue(searched.data.items, 'gpu');
    assert.strictEqual(sorted.at(-1).risk.level, 'blocked');
    assert.ok(sorted.slice(-2).every((ad) => !ad.best));
    assert.strictEqual(kufar.risk(sorted.at(-1)).confidence, 'high');
  } finally {
    global.fetch = fetchReal;
    await new Promise((resolve) => server.close(resolve));
    store.flush();
    store.setDir(previousDir);
  }
});

test('локальная модель: текст статьи без меню и скриптов; материалы укладываются в бюджет', () => {
  const aiLocal = require('../server/aiLocal');
  const html = '<html><nav><p>Меню сайта и ссылки на разделы, которые не нужны модели совсем</p></nav><script>var x=1</script><article><h1>t</h1>'
    + '<p>Первый абзац статьи про видеокарту, достаточно длинный, чтобы считаться текстом.</p>'
    + '<p>Второй абзац статьи: температура под нагрузкой 65 градусов, шум низкий.</p>'
    + '<p>Третий абзац: писк дросселей не замечен, драйверы стабильные.</p></article><footer><p>© Сайт, все права защищены и так далее и тому подобное</p></footer></html>';
  const t = aiLocal.readable(html);
  assert.ok(/Первый абзац/.test(t) && /Третий абзац/.test(t), t);
  assert.ok(!/Меню сайта|var x|права защищены/.test(t), t);
  const out = aiLocal.fit([{ text: 'a'.repeat(100) }, { text: 'b '.repeat(3000) }, { text: 'c '.repeat(3000) }], 3000);
  assert.strictEqual(out[0].text.length, 100, 'короткий — целиком');
  const total = out.reduce((s, x) => s + x.text.length, 0);
  assert.ok(total <= 3000 + 10, 'в бюджете: ' + total);
});

test('новости: 20 лент на двух языках; лента в windows-1251 (4PDA) читается без «кракозябр»', () => {
  const news = require('../server/news');
  const { decodeBody } = require('../server/http');
  assert.ok(news.FEEDS.length >= 20, 'источников: ' + news.FEEDS.length);
  assert.ok(news.FEEDS.every((f) => ['ru', 'en'].includes(f.lang) && /^https:\/\//.test(f.url)));
  assert.strictEqual(new Set(news.FEEDS.map((f) => f.id)).size, news.FEEDS.length, 'id не повторяются');
  // «Привет» в windows-1251, кодировка указана только в <?xml … ?>
  const head = Buffer.from('<?xml version="1.0" encoding="windows-1251"?><rss><channel><item><title>', 'latin1');
  const body = Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);
  const tail = Buffer.from('</title><link>https://4pda.to/a</link></item></channel></rss>', 'latin1');
  const xml = decodeBody(Buffer.concat([head, body, tail]), 'text/xml');
  const items = news.parse(xml, { id: '4pda', name: '4PDA', lang: 'ru' });
  assert.strictEqual(items[0].title, 'Привет');
  // Кодировка из заголовка ответа важнее
  assert.strictEqual(decodeBody(body, 'text/html; charset=windows-1251'), 'Привет');
  assert.strictEqual(decodeBody(Buffer.from('Привет'), ''), 'Привет', 'по умолчанию UTF-8');
});

async function live() {
  if (!process.argv.includes('--live')) return;
  console.log('Живой подбор (Onliner)');
  delete require.cache[require.resolve('../server/providers/onliner')];
  delete require.cache[require.resolve('../server/builder')];
  const builder = require('../server/builder');
  for (const [budget, purpose] of [[2000, 'office'], [3500, 'gaming'], [7000, 'work']]) {
    const r = await builder.build({ budgetByn: budget, purpose });
    const v = r.variants.find((x) => x.id === 'optimal');
    assert.ok(v.build, `сборка на ${budget} (${purpose})`);
    const errors = v.build.checks.filter((c) => c.level === 'error');
    assert.strictEqual(errors.length, 0, errors.map((e) => e.text).join('; '));
    console.log(`  ✓ ${budget} р., ${purpose}: ${v.build.total} р. — ${v.build.parts.cpu.name} / ${v.build.parts.gpu ? v.build.parts.gpu.name : 'встроенная графика'}`);
    passed++;
  }
}

(async () => {
  await Promise.all(pending);
  await live();
  console.log(`\nПройдено: ${passed}, ошибок: ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

