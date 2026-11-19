// Проверка совместимости и расчёт блока питания.
// Общий модуль: используется и сервером (подбор), и интерфейсом (ручная замена деталей).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Compat = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Пиковое потребление процессора, Вт. */
  function cpuPower(cpu) {
    if (!cpu) return 0;
    const s = cpu.specs || {};
    const tdp = s.tdp || 65;
    if (/intel/i.test(cpu.name || '')) {
      if (tdp >= 125) return Math.round(tdp * 1.9); // PL2 у K-серии ≈ 250 Вт
      // У «65-ваттных» Intel реальный предел (PL2) намного выше: i5-13400 ≈ 150 Вт, i7/i9 ≈ 200+ Вт
      const cores = s.cores || 6;
      if (cores >= 16) return 220;
      if (cores >= 12) return 180;
      if (cores >= 10) return 150;
      return Math.round(tdp * 1.8);
    }
    return Math.round(tdp * 1.35); // PPT у AMD ≈ 1.35 × TDP
  }

  /** Потребление видеокарты, Вт. */
  function gpuPower(gpu) {
    if (!gpu) return 0;
    if (gpu.perf && gpu.perf.watts) return gpu.perf.watts;
    const p = ((gpu.specs && gpu.specs.power) || '').toLowerCase();
    if (/16 pin|12v/.test(p)) return 350;
    if (/8\s*\+\s*8\s*\+\s*8/.test(p)) return 400;
    if (/8\s*\+\s*8|6\s*\+\s*8/.test(p)) return 300;
    if (/8 pin/.test(p)) return 220;
    if (/6 pin/.test(p)) return 150;
    return 75;
  }

  /** Рекомендуемая мощность БП: нагрузка × запас на пики и старение, округление до 50 Вт. */
  function psuNeed(cpu, gpu, assumedGpuWatts) {
    const load = cpuPower(cpu) + (gpu ? gpuPower(gpu) : assumedGpuWatts || 0) + 80;
    const rec = Math.max(450, Math.ceil((load * 1.4) / 50) * 50);
    const min = Math.ceil(load * 1.1);
    return { load, rec, min };
  }

  /** Нужен ли отдельный кулер и какой мощности (Вт рассеивания). */
  function coolerNeed(cpu) {
    if (!cpu) return 0;
    const s = cpu.specs || {};
    const p = cpuPower(cpu);
    if (s.withCooler && (s.tdp || 65) <= 65) return 0;
    if (p <= 90) return 120;
    if (p <= 145) return 160;
    if (p <= 180) return 200;
    return 240;
  }

  function boardFitsCase(mbForm, caseItem) {
    if (!caseItem) return true;
    const boards = (caseItem.specs && caseItem.specs.boards) || [];
    if (!boards.length) return true;
    if (mbForm === 'ITX') return true; // mini-ITX встаёт почти в любой корпус
    if (mbForm === 'mATX') return boards.includes('mATX') || boards.includes('ATX');
    if (mbForm === 'EATX') return boards.includes('EATX');
    return boards.includes('ATX') || boards.includes('EATX');
  }

  const OLD_AM4 = /^(A320|B350|X370)$/;
  const OLD_1700 = /^(H610|B660|H670|Z690)$/;

  /**
   * Проверка сборки. parts: { cpu, motherboard, ram, gpu, ssd, hdd, psu, case, cooler }
   * have: { gpu, psu, case, cooler, ... } — что у пользователя уже есть.
   * Возвращает [{ level: 'ok'|'warn'|'error'|'info', text }]
   */
  function check(parts, have) {
    have = have || {};
    const out = [];
    const ok = (t) => out.push({ level: 'ok', text: t });
    const warn = (t) => out.push({ level: 'warn', text: t });
    const err = (t) => out.push({ level: 'error', text: t });
    const info = (t) => out.push({ level: 'info', text: t });

    const { cpu, motherboard: mb, ram, gpu, ssd, psu, cooler } = parts;
    const kase = parts.case;
    const cs = (cpu && cpu.specs) || {};
    const ms = (mb && mb.specs) || {};
    const rs = (ram && ram.specs) || {};

    if (cpu && mb) {
      if (cs.socket && ms.socket && cs.socket !== ms.socket) err(`Сокет процессора ${cs.socket} не подходит к плате с сокетом ${ms.socket}`);
      else if (cs.socket) ok(`Сокет ${cs.socket}: процессор и плата совместимы`);
      if (cs.mem && cs.mem.length && ms.mem && !cs.mem.includes(ms.mem)) err(`Процессор не поддерживает ${ms.mem}, которую использует плата`);
      if (ms.socket === 'AM4' && OLD_AM4.test(ms.chipset || '') && /ryzen\s*\d\s*(pro\s*)?5\d{3}/i.test(cpu.name)) {
        warn(`Плата на чипсете ${ms.chipset} может потребовать обновления BIOS для Ryzen 5000`);
      }
      if (ms.socket === 'LGA1700' && OLD_1700.test(ms.chipset || '') && /i\d-1[34]\d{3}/i.test(cpu.name)) {
        info(`Для Intel 13/14 поколения на ${ms.chipset} может понадобиться свежий BIOS (обычно уже прошит, уточните у продавца)`);
      }
      // Процессоры новее платы: нужна свежая версия BIOS
      if (ms.socket === 'AM5' && /^(A620|B650E?|X670E?)$/.test(ms.chipset || '') && /ryzen\s*\d\s*(pro\s*)?9\d{3}/i.test(cpu.name)) {
        info(`Ryzen 9000 на плате ${ms.chipset}: нужна версия BIOS с поддержкой Ryzen 9000. У плат последних партий она уже есть — уточните у продавца или обновите BIOS (у многих плат есть кнопка BIOS Flashback)`);
      }
      if (ms.socket === 'AM5' && /^(A620|B650E?|X670E?)$/.test(ms.chipset || '') && /ryzen\s*\d\s*(pro\s*)?8\d{3}g/i.test(cpu.name)) {
        info(`Ryzen 8000G на плате ${ms.chipset}: понадобится BIOS с поддержкой этой серии (обычно уже прошит)`);
      }
      if (ms.socket === 'AM4' && /^(B450|X470)$/.test(ms.chipset || '') && /ryzen\s*\d\s*(pro\s*)?5\d{3}/i.test(cpu.name)) {
        info(`Ryzen 5000 на ${ms.chipset}: поддерживается после обновления BIOS — у новых плат обычно уже есть, уточните у продавца`);
      }
      if ((cs.tdp || 0) >= 105 && /^(H610|H510|H410|A320|A520)$/.test(ms.chipset || '')) {
        warn(`Мощный процессор (TDP ${cs.tdp} Вт) на бюджетной плате ${ms.chipset}: возможен перегрев цепей питания`);
      }
    }

    if (ram) {
      if (rs.form && rs.form !== 'DIMM' && rs.form !== 'CUDIMM') err('Выбрана память SO-DIMM (для ноутбуков): в настольную плату не встанет');
      if (rs.registered) err('Серверная (Registered/ECC) память не подойдёт для обычной платы');
      if (mb && ms.mem && rs.type && ms.mem !== rs.type) err(`Плата рассчитана на ${ms.mem}, а память ${rs.type}`);
      else if (mb && rs.type) ok(`Память ${rs.type} подходит к плате`);
      if (mb && ms.memSlots && rs.modules > ms.memSlots) err(`Модулей памяти (${rs.modules}) больше, чем слотов на плате (${ms.memSlots})`);
      if (rs.modules === 1) warn('Один модуль памяти работает в одноканальном режиме: для игр лучше комплект из двух');
      // Подсказка новичку: без профиля в BIOS память работает на базовой частоте
      if (rs.mhz && ((rs.type === 'DDR5' && rs.mhz > 4800) || (rs.type === 'DDR4' && rs.mhz > 2666))) {
        info(`Чтобы память работала на ${rs.mhz} МГц, после сборки включите в BIOS профиль ${cs.socket && /^AM/.test(cs.socket) ? 'EXPO (или XMP/DOCP)' : 'XMP'} — иначе она будет на базовой частоте`);
      }
    }

    if (!gpu && !have.gpu) {
      if (cpu && !cs.hasIgpu) err('У процессора нет встроенной графики, а видеокарта не выбрана: изображения не будет');
      else if (cpu) info('Изображение будет со встроенной графики процессора (подходит для работы и учёбы)');
    }

    if (psu) {
      const need = psuNeed(cpu, gpu, have.gpu ? 250 : 0);
      const w = (psu.specs && psu.specs.watts) || 0;
      if (w && w < need.min) err(`Блок питания ${w} Вт слабоват: пиковая нагрузка около ${need.load} Вт`);
      else if (w && w < need.rec) warn(`Блок питания ${w} Вт впритык: рекомендуется от ${need.rec} Вт`);
      else if (w) ok(`Блок питания ${w} Вт с запасом (нагрузка около ${need.load} Вт)`);
      if (gpu && /16 pin|12v/i.test((gpu.specs && gpu.specs.power) || '') && psu.specs && !psu.specs.pcie5) {
        info('Видеокарте нужен разъём 16-pin: переходник обычно лежит в коробке с картой');
      }
      if (kase && kase.specs && kase.specs.psuIncluded) info('В корпусе уже есть свой блок питания: отдельный БП можно не брать');
    }

    if (kase && mb) {
      if (!boardFitsCase(ms.form, kase)) err(`Плата формата ${ms.form} не помещается в корпус`);
      else ok(`Плата ${ms.form || ''} помещается в корпус`);
    }
    if (cooler && cooler.specs && cooler.specs.aio) {
      info(`Жидкостное охлаждение${cooler.specs.radMm ? ` с радиатором ${cooler.specs.radMm} мм` : ''}: проверьте, что корпус поддерживает такой радиатор`);
    }
    if (kase && cooler && kase.specs.coolerMaxMm && cooler.specs.heightMm) {
      if (cooler.specs.heightMm > kase.specs.coolerMaxMm) err(`Кулер высотой ${cooler.specs.heightMm} мм не влезет: в корпусе до ${kase.specs.coolerMaxMm} мм`);
    }
    if (kase && gpu && kase.specs.gpuMaxMm && kase.specs.gpuMaxMm < 280 && gpu.perf && gpu.perf.watts >= 200) {
      warn(`В корпус влезают видеокарты до ${kase.specs.gpuMaxMm} мм: проверьте длину выбранной карты`);
    }

    if (cpu && !have.cooler) {
      const need = coolerNeed(cpu);
      if (need && !cooler) err('Процессор без кулера в комплекте: нужен отдельный кулер');
      else if (need && cooler && cooler.specs.tdp && cooler.specs.tdp < need) warn(`Кулер рассчитан на ${cooler.specs.tdp} Вт, а желательно от ${need} Вт`);
      else if (!need && !cooler) ok('Кулер идёт в комплекте с процессором');
      else if (cooler) ok('Охлаждение процессора подобрано с запасом');
    }

    if (ssd && mb && ssd.specs.form === 'M.2' && ms.m2 === 0) warn('На плате не указаны слоты M.2: проверьте, куда ставить SSD');
    return out;
  }

  function gamingTier(s) {
    if (s < 12) return 'Офис, браузер, видео';
    if (s < 40) return 'Лёгкие и старые игры';
    if (s < 70) return 'Игры в 1080p на средних';
    if (s < 105) return 'Игры в 1080p на высоких';
    if (s < 145) return '1080p ультра / 1440p высокие';
    if (s < 200) return 'Игры в 1440p на ультра';
    if (s < 270) return '4K на высоких';
    return '4K на ультра';
  }

  /** Индексы для показа: игровой и рабочий (RTX 4060 + Ryzen 5 5600 ≈ 100). */
  function indices(parts, haveGpu) {
    const cpu = parts.cpu;
    if (!cpu || !cpu.perf) return { gaming: null, work: null, tier: '—' };
    const gpu = parts.gpu;
    const g = haveGpu ? null : gpu && gpu.perf ? gpu.perf.score : cpu.perf.igpu || 1;
    // Память: мало или один модуль (одноканальный режим) заметно режет производительность
    const rs = parts.ram && parts.ram.specs;
    let ramG = 1;
    let ramW = 1;
    if (rs && rs.totalGb) {
      ramG = rs.totalGb >= 30 ? 1 : rs.totalGb >= 15 ? 0.95 : 0.75;
      ramW = rs.totalGb >= 60 ? 1.03 : rs.totalGb >= 30 ? 1 : rs.totalGb >= 15 ? 0.88 : 0.7;
      if (rs.modules === 1) {
        ramG *= 0.93;
        ramW *= 0.95;
      }
    }
    const gaming = g == null ? null : Math.round(Math.pow(g, 0.7) * Math.pow(cpu.perf.gaming, 0.3) * ramG);
    const work = Math.round(Math.pow(cpu.perf.multi, 0.75) * Math.pow(g == null ? 100 : Math.max(g, 10), 0.25) * ramW);
    const eff = g == null ? null : Math.min(g, cpu.perf.gaming * 1.7) * ramG;
    return { gaming, work, tier: eff == null ? 'Зависит от вашей видеокарты' : gamingTier(eff) };
  }

  return { cpuPower, gpuPower, psuNeed, coolerNeed, boardFitsCase, check, indices, gamingTier };
});
