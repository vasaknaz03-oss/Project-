'use strict';
// Тесты без сети: разбор описаний, распознавание моделей, совместимость, оптимизатор на подставных данных.
// Запуск: npm test        (добавьте --live, чтобы прогнать подбор на живых данных Onliner)

const assert = require('assert');
const { parseSpecs } = require('../server/parsers');
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
  const cool = parseSpecs('fan', 'рассеивание до 220 Вт, высота 154 мм, вентилятор 120 мм');
  assert.strictEqual(cool.tdp, 220);
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
  assert.ok(c.tdp >= 300);
});

console.log('Kufar и каталог разделов');
test('фильтры Kufar → параметры поиска', () => {
  const KF = require('../server/providers/kufarFilters');
  assert.deepStrictEqual(KF.toParams({ ccbr: ['13', '54'], rgn: ['7'], prc: { from: 500, to: 1500 }, dle: 1, ar: [] }),
    { ccbr: 'v.or:13,54', rgn: '7', prc: 'r:50000,150000', dle: '1' });
  assert.deepStrictEqual(KF.toParams({ prc: { to: 300 } }), { prc: 'r:,30000' });
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
  let ads = [{ id: '1', name: 'Видеокарта RTX 3060 12GB', price: 900, source: 'kufar' }];
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
    ads = [{ id: '2', name: 'RTX 3060 Palit', price: 850, source: 'kufar' }, ...ads];
    await W.check({ force: true });
    assert.deepStrictEqual(got, ['ads']);
    const sum = W.summary();
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

console.log('Оптимизатор (подставные данные)');
test('подбирает совместимую сборку в рамках бюджета', () => {
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
  onliner.category = async (schema) => ({ items: fixtures[schema] || [], total: (fixtures[schema] || []).length });
  const builder = require('../server/builder');
  return builder.build({ budgetByn: 3000, purpose: 'gaming' }).then((r) => {
    const v = r.variants.find((x) => x.id === 'optimal');
    assert.ok(v.build, 'сборка найдена');
    const p = v.build.parts;
    assert.ok(v.build.total <= 3000, 'в бюджете: ' + v.build.total);
    assert.strictEqual(p.cpu.specs.socket, p.motherboard.specs.socket);
    assert.strictEqual(p.ram.specs.type, p.motherboard.specs.mem);
    assert.ok(p.gpu, 'для игр есть видеокарта');
    assert.ok(p.cooler, 'OEM-процессору нужен кулер');
    assert.ok(!v.build.checks.some((c) => c.level === 'error'), 'без ошибок совместимости');
    console.log(`    → ${p.cpu.name} + ${p.gpu.name}, итого ${v.build.total} р.`);
  });
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

