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
      if (tdp >= 125) {
        // PL2 у K-серии: i9/i7 (20+ ядер) ≈ 253 Вт, i5 (14 ядер) ≈ 181 Вт
        const c = s.cores || 0;
        return c >= 20 ? 253 : c >= 14 ? 181 : c >= 10 ? 160 : Math.round(tdp * 1.4);
      }
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
    if (gpu.specs?.boardWatts > 0) return gpu.specs.boardWatts;
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
    const rec = Math.max(450, Math.ceil((load * 1.4) / 50) * 50, gpu?.specs?.recommendedPsuWatts || 0);
    const min = Math.ceil(load * 1.1);
    return { load, rec, min };
  }

  /** Нужен ли отдельный кулер и какой мощности (Вт рассеивания). */
  /**
   * Какой кулер нужен процессору, Вт: пиковое потребление с запасом 10%.
   * У X3D кристалл с кэшем хуже отдаёт тепло — запас ещё 10%.
   */
  function coolerNeed(cpu) {
    if (!cpu) return 0;
    const s = cpu.specs || {};
    if (s.withCooler && (s.tdp || 65) <= 65) return 0;
    const p = cpuPower(cpu);
    const x3d = /x3d/i.test(cpu.name || '');
    return Math.max(100, Math.round((p * (x3d ? 1.2 : 1.1)) / 5) * 5);
  }

  // Модели кулеров, проверенные обзорами. Производители завышают «рассеивание до … Вт»,
  // поэтому реальную способность оцениваем по классу кулера.
  const DUAL_TOWER = /peerless assassin|phantom spirit|frost commander|frost spirit|royal knight|royal pretor|\bak620|\bak500\b|assassin iv|frozn a720|frozn a620|se-207|dark rock (pro|elite)|nh-d15|nh-d12|\brz620|\brz700|freezer 36|\bfuma\b|mugen|hyper 622|cr-?1400|nh-u12a|ag620|\ble720/i;
  const GOOD_TOWER = /\bak400|assassin x 120|burst assassin|se-224|se-226|frozn a410|frozn a400|pure rock 3|hyper 212|\brz400|cr-?1000 evo|freezer 34|dark rock 5\b|\bag500|ar12/i;

  /** Реальная способность кулера отводить тепло, Вт (оценка). */
  function coolerCapacity(c) {
    if (!c) return 0;
    const s = c.specs || {};
    const claim = s.tdp || 0;
    let cap;
    if (s.aio) cap = s.radMm >= 360 ? 300 : s.radMm >= 280 ? 270 : s.radMm >= 240 ? 240 : 150;
    else if (s.heightMm && s.heightMm < 100) cap = 95; // низкопрофильный
    else if (DUAL_TOWER.test(c.name || '')) cap = 270;
    else if (GOOD_TOWER.test(c.name || '')) cap = 190;
    else cap = (c.price || 0) < 40 ? 130 : (c.price || 0) < 70 ? 160 : 185;
    return claim ? Math.min(claim, cap) : cap;
  }

  /** Класс кулера человеческими словами. */
  function coolerClass(c) {
    const s = (c && c.specs) || {};
    if (s.aio) return `СЖО${s.radMm ? ' ' + s.radMm + ' мм' : ''}`;
    if (s.heightMm && s.heightMm < 100) return 'низкопрофильный кулер';
    if (DUAL_TOWER.test((c && c.name) || '')) return 'двухбашенный кулер (6–7 трубок)';
    if (GOOD_TOWER.test((c && c.name) || '')) return 'башенный кулер (4–5 трубок, хорошие отзывы)';
    return 'башенный кулер';
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

  function gpuCaseErrors(gpu, kase) {
    if (!gpu || !kase) return [];
    const s = gpu.specs || {};
    const c = kase.specs || {};
    const messages = [];
    if (s.lengthMm > 0 && c.gpuMaxMm > 0 && s.lengthMm > c.gpuMaxMm) {
      messages.push(`Видеокарта длиной ${s.lengthMm} мм не помещается: корпус поддерживает до ${c.gpuMaxMm} мм.`);
    }
    if (s.thicknessMm > 0 && c.gpuMaxThicknessMm > 0 && s.thicknessMm > c.gpuMaxThicknessMm) {
      messages.push(`Видеокарта толщиной ${s.thicknessMm} мм не помещается: корпус поддерживает до ${c.gpuMaxThicknessMm} мм.`);
    }
    if (s.slots > 0 && c.expansionSlots > 0 && Math.ceil(s.slots) > c.expansionSlots) {
      messages.push(`Видеокарта займёт ${Math.ceil(s.slots)} слота, у корпуса всего ${c.expansionSlots}.`);
    }
    return messages;
  }

  function checkGpuPower(gpu, psu) {
    if (!gpu || !psu) return null;
    const need = gpu.specs?.gpuInputs;
    if (!need) return { level: 'warn', text: 'Уточните, нужны ли видеокарте кабели дополнительного питания.' };
    const { six = 0, eight = 0, sixteen = 0 } = need;
    if (!six && !eight && !sixteen) return null;
    const available = psu.specs?.gpuOutputs || {};
    const issue = (level, text) => ({ level, text });
    let eightNeeded = eight;
    let usingAdapter = false;
    if (sixteen && (available.sixteen ?? 0) < sixteen) {
      const adapter8 = gpu.specs.adapter8;
      if (adapter8 > 0 && sixteen === 1) {
        eightNeeded += adapter8;
        usingAdapter = true;
      } else if (available.sixteen == null) {
        return issue('warn', 'Проверьте, есть ли у блока питания подходящий кабель 16-pin для видеокарты.');
      } else {
        return issue('error', 'Видеокарте нужен 16-pin, в указанных разъёмах блока питания его не хватает.');
      }
    }
    const lack6 = Math.max(0, six - (available.six ?? 0));
    const lack8 = Math.max(0, eightNeeded - (available.eight ?? 0));
    if (lack6 + lack8 > (available.flex ?? 0)) {
      if (usingAdapter && available.sixteen == null) {
        return issue('warn', 'Уточните, есть ли родной кабель 16-pin или нужное число кабелей PCIe для указанного переходника.');
      }
      if (available.flex == null || (lack6 && available.six == null) || (lack8 && available.eight == null)) {
        return issue('warn', 'Уточните число кабелей питания PCIe для видеокарты у выбранного блока питания.');
      }
      return issue('error', 'У блока питания не хватает указанных разъёмов PCIe 6/8-pin для этой видеокарты.');
    }
    if (usingAdapter) return issue('warn', 'В комплектации указан переходник на 16-pin. Сверьте по руководству, какие отдельные кабели БП нужны для подключения.');
    return issue('ok', 'Указанные разъёмы питания видеокарты и блока питания совпадают.');
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
      else warn(`Мощность блока питания не указана — уточните у продавца: нужно от ${need.rec} Вт (нагрузка около ${need.load} Вт)`);
      const power = checkGpuPower(gpu, psu);
      if (power) out.push(power);
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
    if (kase && gpu) {
      gpuCaseErrors(gpu, kase).forEach(err);
      const g = gpu.specs || {};
      const c = kase.specs || {};
      if (!g.lengthMm || !c.gpuMaxMm) warn('Уточните длину видеокарты и допустимую длину в корпусе.');
      else if (g.lengthMm <= c.gpuMaxMm) ok(`Длина видеокарты ${g.lengthMm} мм при лимите корпуса ${c.gpuMaxMm} мм.`);
      if (g.thicknessMm > 0 && c.gpuMaxThicknessMm > 0 && g.thicknessMm <= c.gpuMaxThicknessMm) ok('Толщина видеокарты укладывается в указанный предел корпуса.');
      else if (!(g.thicknessMm > 0 && c.gpuMaxThicknessMm > 0) && !(g.slots > 0 && c.expansionSlots > 0 && Math.ceil(g.slots) > c.expansionSlots)) {
        warn('Проверьте свободные слоты и место по толщине видеокарты в корпусе.');
      }
    }

    if (cpu && !have.cooler) {
      const need = coolerNeed(cpu);
      if (need && !cooler) err('Процессор без кулера в комплекте: нужен отдельный кулер');
      else if (need && cooler && coolerCapacity(cooler) < need) {
        warn(`Кулер слабоват: ${coolerClass(cooler)} реально отводит около ${coolerCapacity(cooler)} Вт, а процессору в пике нужно ~${need} Вт. Нужен двухбашенный кулер (6–7 тепловых трубок) или СЖО 240–360 мм`);
      }
      else if (!need && !cooler) ok('Кулер идёт в комплекте с процессором');
      else if (cooler) ok(`Охлаждение с запасом: ${coolerClass(cooler)} (~${coolerCapacity(cooler)} Вт) при пике процессора ~${cpuPower(cpu)} Вт`);
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

  return { cpuPower, gpuPower, psuNeed, coolerNeed, coolerCapacity, coolerClass, boardFitsCase, gpuCaseErrors, checkGpuPower, check, indices, gamingTier };
});
