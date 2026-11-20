// Данные для вкладки «Разгон»: где что находится в BIOS у разных производителей плат и генератор памятки.
// Пути сверены с руководствами и FAQ производителей и обзорами BIOS; у разных моделей и версий BIOS
// названия могут немного отличаться — поэтому в интерфейсе всегда есть ссылка на руководство платы.

export const BIOS = {
  asus: {
    short: 'ASUS', name: 'ASUS (ROG, TUF, Prime, ProArt)', re: /\basus\b|\brog\b|\btuf\b|\bprime\b|proart|strix/i,
    look: 'UEFI BIOS Utility: сначала открывается простой режим EZ Mode, все настройки разгона — в Advanced Mode на вкладке Ai Tweaker.',
    enter: 'Del или F2 сразу после включения', modes: 'F7 — переключение EZ Mode ↔ Advanced Mode', search: 'F9 — поиск пункта по названию', save: 'F10 — сохранить и перезагрузить',
    amd: [
      ['Профиль памяти EXPO', 'Ai Tweaker → Ai Overclock Tuner → EXPO I (или EXPO II; для памяти без EXPO — DOCP)'],
      ['PBO и Curve Optimizer', 'Ai Tweaker → Precision Boost Overdrive → Precision Boost Overdrive: Advanced → Curve Optimizer (то же меню AMD есть в Advanced → AMD Overclocking)'],
      ['Тайминги памяти', 'Ai Tweaker → DRAM Timing Control'],
      ['Напряжения (SoC, VDD/VDDQ)', 'Ai Tweaker → пункты VDDSOC, DRAM VDD / VDDQ'],
    ],
    intel: [
      ['Профиль памяти XMP', 'Ai Tweaker → Ai Overclock Tuner → XMP I (или XMP II)'],
      ['Профиль Intel (13–14 поколение)', 'Ai Tweaker → Performance Preferences → Intel Default Settings (появился в BIOS с мая 2024)'],
      ['Лимиты мощности и андервольт', 'Ai Tweaker → Internal CPU Power Management (PL1/PL2, Load Line); смещение напряжения — CPU Core/Cache Voltage → Offset Mode'],
      ['Тайминги памяти', 'Ai Tweaker → DRAM Timing Control'],
    ],
    fans: 'Monitor → Q-Fan Configuration (в EZ Mode — Q-Fan Control, F6)',
    rebar: 'Advanced → PCI Subsystem Settings → Above 4G Decoding и Re-Size BAR Support',
    profiles: 'Tool → ASUS User Profile',
    flash: 'Tool → ASUS EZ Flash 3 Utility (файл BIOS на флешке)',
    flashback: 'USB BIOS FlashBack — кнопка на задней панели (есть не у всех плат): работает даже без процессора',
    cmos: 'Кнопка Clear CMOS (у старших плат) или перемычка CLRTC',
    support: 'https://www.asus.com/support/download-center/',
    sources: [{ name: 'ASUS FAQ (EXPO)', url: 'https://www.asus.com/support/faq/1042256/' }, { name: 'ASUS FAQ (Intel Default Settings)', url: 'https://www.asus.com/support/faq/1053456/' }],
  },
  gigabyte: {
    short: 'Gigabyte', name: 'Gigabyte (AORUS, Gaming X, Eagle, DS3H)', re: /gigabyte|aorus|\bgaming x\b|\beagle\b|ds3h/i,
    look: 'Сначала Easy Mode (там есть быстрый переключатель XMP/EXPO), полный доступ — Advanced Mode, разгон на вкладке Tweaker.',
    enter: 'Del сразу после включения', modes: 'F2 — Easy Mode ↔ Advanced Mode', save: 'F10 — сохранить и перезагрузить',
    amd: [
      ['Профиль памяти EXPO', 'Tweaker → Extreme Memory Profile (X.M.P.) → профиль EXPO (также в Easy Mode)'],
      ['PBO и Curve Optimizer', 'Tweaker → Advanced CPU Settings → Precision Boost Overdrive; Curve Optimizer — внутри настроек PBO (на части версий — Settings → AMD Overclocking)'],
      ['Тайминги памяти', 'Tweaker → Advanced Memory Settings → Memory Sub Timings'],
      ['Напряжения', 'Tweaker → Advanced Voltage Settings'],
    ],
    intel: [
      ['Профиль памяти XMP', 'Tweaker → Extreme Memory Profile (X.M.P.)'],
      ['Профиль Intel (13–14 поколение)', 'Tweaker → Advanced CPU Settings → профиль Intel Default Settings (название зависит от версии BIOS — сверьтесь с руководством)'],
      ['Лимиты мощности и андервольт', 'Tweaker → Advanced CPU Settings (лимиты) и Advanced Voltage Settings (смещение напряжения)'],
      ['Тайминги памяти', 'Tweaker → Advanced Memory Settings → Memory Sub Timings'],
    ],
    fans: 'Smart Fan 6 (клавиша F6)',
    rebar: 'Settings → IO Ports → Above 4G Decoding и Re-Size BAR Support',
    profiles: 'Save & Exit → Save Profiles / Load Profiles',
    flash: 'Q-Flash (клавиша F8, файл BIOS на флешке)',
    flashback: 'Q-Flash Plus — кнопка на задней панели (у многих плат): обновление без процессора и памяти',
    cmos: 'Перемычка CLR_CMOS (у старших плат — кнопка)',
    support: 'https://www.gigabyte.com/Support',
    sources: [{ name: 'TechPowerUp: BIOS Gigabyte X870', url: 'https://www.techpowerup.com/review/gigabyte-x870-aorus-elite-wifi-7/6.html' }],
  },
  msi: {
    short: 'MSI', name: 'MSI (MAG, MPG, MEG, PRO)', re: /\bmsi\b|\bmag\b|\bmpg\b|\bmeg\b|tomahawk|mortar|carbon/i,
    look: 'Click BIOS: в EZ Mode вверху есть переключатели профиля памяти (XMP/EXPO) и Game Boost; разгон — в Advanced Mode, раздел OC.',
    enter: 'Del сразу после включения', modes: 'F7 — EZ Mode ↔ Advanced Mode', search: 'Ctrl+F — поиск пункта (в Advanced Mode)', save: 'F10 — сохранить и перезагрузить',
    amd: [
      ['Профиль памяти EXPO', 'В EZ Mode — переключатель EXPO вверху экрана; в Advanced Mode — OC → настройки DRAM (профиль EXPO/XMP)'],
      ['PBO и Curve Optimizer', 'OC → Advanced CPU Configuration → AMD Overclocking → Precision Boost Overdrive → Advanced → Curve Optimizer (можно по CCD или по ядрам)'],
      ['Тайминги памяти', 'OC → Advanced DRAM Configuration'],
      ['Напряжения', 'OC → раздел напряжений (CPU SoC, DRAM VDD/VDDQ)'],
    ],
    intel: [
      ['Профиль памяти XMP', 'В EZ Mode — переключатель XMP; в Advanced Mode — OC → Extreme Memory Profile (XMP)'],
      ['Профиль Intel (13–14 поколение)', 'OC → CPU Cooler Tuning → Intel Default Settings (BIOS также предлагает выбрать при первом входе)'],
      ['Лимиты мощности и андервольт', 'OC → Advanced CPU Configuration (лимиты) и CPU Core Voltage → Offset Mode'],
      ['Тайминги памяти', 'OC → Advanced DRAM Configuration'],
    ],
    fans: 'Hardware Monitor',
    rebar: 'Settings → Advanced → PCI Subsystem Settings → Above 4G memory и Re-Size BAR Support',
    profiles: 'OC Profile',
    flash: 'M-Flash (файл BIOS на флешке)',
    flashback: 'Flash BIOS Button — кнопка на задней панели (у многих плат): обновление без процессора',
    cmos: 'Кнопка Clear CMOS или перемычка JBAT1',
    support: 'https://www.msi.com/support',
    sources: [{ name: 'MSI: Curve Optimizer', url: 'https://www.msi.com/blog/how-to-use-curve-optimizer-to-lower-ryzen-9-9950x3d-temperatures-and-boost-performance' }, { name: 'MSI: Intel Default Settings', url: 'https://www.msi.com/blog/improving-stability-of-13th-14th-gen-intel-core-processors-with-intel-default-settings' }],
  },
  asrock: {
    short: 'ASRock', name: 'ASRock (Taichi, Steel Legend, Pro RS, HDV)', re: /asrock|taichi|steel legend|pro rs|\bhdv\b|phantom gaming/i,
    look: 'Разгон памяти и процессора — на вкладке OC Tweaker, меню AMD (PBO, Curve Optimizer) — на вкладке Advanced.',
    enter: 'F2 или Del сразу после включения', modes: 'F6 — Easy Mode ↔ Advanced Mode (у части плат простого режима нет)', save: 'F10 — сохранить и перезагрузить',
    amd: [
      ['Профиль памяти EXPO', 'OC Tweaker → DRAM Profile Configuration → DRAM Profile Setting → EXPO'],
      ['PBO и Curve Optimizer', 'Advanced → AMD Overclocking → Precision Boost Overdrive → Curve Optimizer'],
      ['Тайминги памяти', 'OC Tweaker → DRAM Timing Configuration'],
      ['Напряжения', 'OC Tweaker → Voltage Configuration'],
    ],
    intel: [
      ['Профиль памяти XMP', 'OC Tweaker → DRAM Configuration → Load XMP Setting'],
      ['Профиль Intel (13–14 поколение)', 'OC Tweaker → профиль Intel Default (Intel Baseline) — название зависит от версии BIOS'],
      ['Лимиты мощности и андервольт', 'OC Tweaker → CPU Configuration (лимиты) и Voltage Configuration (смещение)'],
      ['Тайминги памяти', 'OC Tweaker → DRAM Configuration → DRAM Timing Configuration'],
    ],
    fans: 'H/W Monitor → FAN-Tastic Tuning',
    rebar: 'Advanced → Chipset Configuration → Above 4G Decoding и Re-Size BAR Support',
    profiles: 'OC Tweaker → внизу: сохранение пользовательского профиля (User UEFI Setup Profile)',
    flash: 'Tool → Instant Flash (файл BIOS на флешке)',
    flashback: 'BIOS Flashback — кнопка на задней панели (у части плат)',
    cmos: 'Перемычка CLRMOS1 (у старших плат — кнопка Clear CMOS)',
    support: 'https://www.asrock.com/support/index.asp',
    sources: [{ name: 'TechPowerUp: BIOS ASRock B650E', url: 'https://www.techpowerup.com/review/asrock-b650e-steel-legend-wifi/5.html' }],
  },
  biostar: {
    short: 'Biostar', name: 'Biostar', re: /biostar/i,
    look: 'BIOS на базе AMI: настройки разгона собраны в разделе O.N.E. (Overclocking Navigation Engine).',
    enter: 'Del сразу после включения', modes: 'Простого режима обычно нет', save: 'F10 — сохранить и перезагрузить',
    amd: [
      ['Профиль памяти EXPO/XMP', 'O.N.E. → настройки памяти (Memory) → профиль EXPO/XMP'],
      ['PBO и Curve Optimizer', 'Стандартное меню AMD: Advanced → AMD Overclocking → Precision Boost Overdrive'],
      ['Тайминги памяти', 'O.N.E. → раздел памяти (тайминги)'],
    ],
    intel: [
      ['Профиль памяти XMP', 'O.N.E. → настройки памяти → XMP'],
      ['Лимиты мощности', 'O.N.E. → CPU Configuration'],
    ],
    fans: 'Smart Fan Control (раздел Advanced или H/W Monitor)',
    rebar: 'Advanced → PCI Subsystem Settings → Above 4G Decoding и Re-Size BAR',
    profiles: 'Save & Exit → сохранение профиля (если есть в вашей версии)',
    flash: 'Вкладка Tools / BIO-Flasher (файл на флешке)',
    flashback: 'У большинства плат нет',
    cmos: 'Перемычка JCMOS1 или батарейка',
    support: 'https://www.biostar.com.tw/',
    note: 'Названия у Biostar сильнее зависят от модели — проверяйте по руководству платы.',
  },
  china: {
    short: 'Китайские (Huananzhi, Machinist, Jingyue, Maxsun, Colorful)', name: 'Китайские платы', re: /huananzhi|machinist|jingyue|maxsun|colorful|soyo|kllisre|atermiter|qiyida/i,
    look: 'Почти всегда «голый» BIOS AMI Aptio: серый или синий экран с вкладками Main, Advanced, Chipset, Boot, Save & Exit. Новые платы Maxsun и Colorful похожи на обычные бренды.',
    enter: 'Del (иногда F2 или Esc)', modes: 'Простого режима обычно нет', save: 'F4 или F10 — сохранить и выйти',
    amd: [
      ['Профиль памяти', 'Если есть: Advanced → AMD Overclocking → DDR and Infinity Fabric Frequency/Timings; иначе частоту выставляют вручную'],
      ['PBO и Curve Optimizer', 'Advanced → AMD Overclocking → Precision Boost Overdrive (если производитель его оставил)'],
    ],
    intel: [
      ['Частота памяти', 'Chipset → North Bridge → Memory Configuration (на X99/Xeon — частота и тайминги вручную)'],
      ['Лимиты мощности', 'Advanced → Power & Performance → CPU Power Management Control'],
    ],
    fans: 'Обычно Advanced → Hardware Monitor / Smart Fan (не у всех)',
    rebar: 'Advanced → PCI Subsystem Settings → Above 4G Decoding (Re-Size BAR есть не везде)',
    profiles: 'Обычно нет',
    flash: 'Часто только через утилиту в Windows или программатор — следуйте инструкции продавца',
    flashback: 'Обычно нет',
    cmos: 'Перемычка рядом с батарейкой или вынуть батарейку на 1–2 минуты',
    support: 'https://www.google.com/search?q=%D0%BA%D0%B8%D1%82%D0%B0%D0%B9%D1%81%D0%BA%D0%B0%D1%8F+%D0%BF%D0%BB%D0%B0%D1%82%D0%B0+BIOS+%D0%BE%D0%B1%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5',
    note: 'Модифицированные BIOS для X99 (разблокировка Turbo Boost и т. п.) ставьте только из проверенных источников: неудачная прошивка часто лечится лишь программатором. Следите за температурой VRM — на дешёвых платах она без радиатора.',
  },
};

export const PLATFORMS = {
  am5x3d: { name: 'AMD Ryzen X3D на AM5 (7800X3D, 9800X3D, 9850X3D…)', side: 'amd', mem: 'DDR5' },
  am5: { name: 'AMD Ryzen 7000/8000/9000 на AM5', side: 'amd', mem: 'DDR5' },
  am4: { name: 'AMD Ryzen 3000/5000 на AM4', side: 'amd', mem: 'DDR4' },
  intelk: { name: 'Intel Core 12–14 поколения с буквой K', side: 'intel', mem: 'DDR5' },
  intel: { name: 'Intel Core 12–14 поколения без K (12400F, 13400F, 14400F)', side: 'intel', mem: 'DDR4' },
  ultra: { name: 'Intel Core Ultra 200S (LGA1851)', side: 'intel', mem: 'DDR5' },
};

/** Производитель платы по названию детали. */
export function vendorOf(mb) {
  const n = (mb && mb.name) || '';
  if (!n) return null;
  for (const [id, v] of Object.entries(BIOS)) if (v.re.test(n)) return id;
  return null;
}

/** Платформа по процессору. */
export function platformOf(cpu) {
  if (!cpu) return null;
  const n = cpu.name || '';
  const s = cpu.specs || {};
  if (/core\s*ultra/i.test(n) || s.socket === 'LGA1851') return 'ultra';
  if (/intel|core\s*i\d/i.test(n)) return /\d{4,5}k/i.test(n) ? 'intelk' : 'intel';
  if (s.socket === 'AM4' || /ryzen\s*\d\s*[1-5]\d{3}/i.test(n)) return 'am4';
  if (/x3d/i.test(n)) return 'am5x3d';
  return 'am5';
}

function find(rows, key) {
  const r = (rows || []).find(([a]) => a.startsWith(key));
  return r ? r[1] : null;
}

/** Пошаговая памятка: платформа × производитель платы × память. */
export function memoOf(platform, vendor, mem, parts = {}) {
  const P = PLATFORMS[platform] || PLATFORMS.am5;
  const V = BIOS[vendor] || BIOS.asus;
  const side = V[P.side] ? P.side : V.amd ? 'amd' : 'intel';
  const rows = V[side];
  const ddr5 = mem === 'DDR5';
  const amd = P.side === 'amd';
  const steps = [];
  steps.push({
    title: 'Обновите BIOS',
    text: [
      `Скачайте последнюю версию для вашей модели на сайте ${V.short} (страница поддержки платы → BIOS) и запишите на флешку FAT32.`,
      platform === 'intelk' || platform === 'intel' ? 'Для Core 13–14 поколения нужен BIOS с микрокодом Intel 0x12B или новее — он исправляет повышенные напряжения, из-за которых процессоры деградировали.' : 'Новые версии улучшают совместимость с памятью и стабильность — особенно на AM5.',
      `Если плата не стартует или процессор слишком новый для её BIOS: ${V.flashback}.`,
    ],
    path: V.flash,
  });
  steps.push({ title: 'Зайдите в BIOS и включите расширенный режим', text: [`${V.enter}. ${V.modes}.${V.search ? ' ' + V.search + '.' : ''}`, 'Сфотографируйте экраны с настройками, которые будете менять. Сброс настроек: ' + V.cmos + '.'] });
  if (!amd && (platform === 'intelk' || platform === 'intel')) {
    steps.push({ title: 'Профиль Intel Default Settings', text: ['Задаёт безопасные лимиты мощности и тока, рекомендованные Intel. Для i9 обычно выбирают вариант Performance.'], path: find(rows, 'Профиль Intel') });
  }
  steps.push({
    title: ddr5 ? `Профиль памяти ${amd ? 'EXPO' : 'XMP'}` : `Профиль памяти ${amd ? 'XMP/DOCP' : 'XMP'}`,
    text: [
      'Без профиля память работает на базовой частоте (DDR5 4800, DDR4 2133–2666) — это до −10–20% FPS там, где важна память.',
      ddr5 && amd ? 'Первая загрузка после включения может идти 1–3 минуты (тренировка памяти) — не выключайте компьютер.' : 'После включения проверьте частоту в Windows: Диспетчер задач → Производительность → Память.',
      amd && ddr5 ? 'Оптимум для AM5: 6000 МТ/с CL30 с соотношением UCLK = MCLK (1:1) — обычно выставляется само.' : amd ? 'Оптимум для AM4: 3200–3600 МТ/с, FCLK = частота памяти / 2 (1:1).' : ddr5 ? 'Intel с DDR5 работает в режиме Gear 2 — это нормально.' : 'Для DDR4 на Intel оптимален режим Gear 1 до 3600 МТ/с.',
    ],
    path: find(rows, 'Профиль памяти') || find(rows, 'Частота памяти'),
  });
  steps.push({ title: 'Проверьте стабильность памяти', text: ['TestMem5 или MemTest86 — 1–2 часа без ошибок, затем игры. Ошибки — отключите профиль или поднимите частоту на шаг ниже.'] });
  if (amd) {
    const x3d = platform === 'am5x3d';
    steps.push({
      title: 'Curve Optimizer (андервольт с ускорением)',
      text: [
        'Precision Boost Overdrive → Advanced; Curve Optimizer → All Cores → Negative.',
        x3d ? 'Для X3D начните с 10, шаг 5; обычно стабильны значения 10–25.' : platform === 'am4' ? 'Доступно у Ryzen 5000 (у 3000 — нет). Начните с 10, шаг 5; обычно 15–30.' : 'Начните с 10, шаг 5; обычно стабильны 15–30.',
        'После каждого шага: OCCT или y-cruncher 30 минут и обычная работа — нестабильность Curve Optimizer часто видна в простое и лёгкой нагрузке.',
      ],
      path: find(rows, 'PBO'),
    });
  } else if (platform === 'intelk' || platform === 'intel') {
    steps.push({
      title: platform === 'intelk' ? 'Андервольт процессора' : 'Лимиты мощности (без K множитель закрыт)',
      text: platform === 'intelk'
        ? ['Отрицательное смещение напряжения ядра −0,05…−0,1 В или понижение AC Load Line, шагами. Undervolt Protection — выключить (если пункт есть).', 'Напряжение ядра не повышайте: у 13–14 поколения это риск деградации.']
        : ['На многих платах B660/B760 можно поднять PL1/PL2 — нужен кулер с запасом.', 'Память DDR4 на этих платах разгоняется: Gear 1 до 3600–3800.'],
      path: find(rows, 'Лимиты'),
    });
  } else if (platform === 'ultra') {
    steps.push({ title: 'Профиль 200S Boost (K-модели)', text: ['Официальный ускоренный режим Intel в BIOS: поднимает частоту связи между блоками процессора и поддерживает быструю память. Включайте после стабильного XMP.'] });
  }
  steps.push({ title: 'Вентиляторы и Resizable BAR', text: ['Настройте кривую вентиляторов, чтобы при простое было тихо.', 'Включите Above 4G Decoding и Re-Size BAR — небольшой прирост FPS в части игр (нужна загрузка Windows в режиме UEFI).'], path: `${V.fans}; ${V.rebar}` });
  steps.push({ title: 'Сохраните профиль', text: ['Когда всё стабильно — сохраните настройки в профиль: после обновления BIOS их можно будет вернуть одним кликом.'], path: V.profiles });
  const limits = [];
  if (amd && ddr5) limits.push('Напряжение SoC (VSOC) на AM5 — не выше 1,30 В: AMD ограничила его после случаев повреждения процессоров.');
  if (amd && !ddr5) limits.push('VSOC на AM4 для ежедневного использования обычно до 1,15–1,20 В.');
  if (ddr5) limits.push('DDR5 VDD/VDDQ для ежедневной работы — обычно до 1,40 В; модули DDR5 дают ошибки при нагреве выше ~55 °C.');
  else limits.push('DDR4 — обычно до 1,40–1,45 В при хорошем обдуве (Samsung B-die), для остальных чипов — до 1,35–1,40 В.');
  if (amd) limits.push(platform === 'am4' ? 'Ryzen 5000 под нагрузкой — до 85–90 °C.' : 'Ryzen 7000/9000 до 95 °C под полной нагрузкой — штатный режим, процессор сам держит температуру.');
  else limits.push('Intel: TjMax 100 °C; в тестах лучше держать до 85–90 °C. Напряжение ядра не повышайте.');
  limits.push('Видеокарта: андервольт в MSI Afterburner (NVIDIA) или Adrenalin (AMD) — безопасен; память видеокарты до 95–100 °C (Memory Junction).');
  const cpu = parts.cpu ? parts.cpu.name : P.name;
  return { title: `${cpu} + плата ${V.short}${parts.ram ? ' + ' + parts.ram.name : ''}`, steps, limits };
}
