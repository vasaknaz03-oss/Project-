// Проверенные источники и поля памятки. Универсальных таблиц напряжений и частот здесь нет.
// Старые пути BIOS, offsets, частоты памяти и температуры не были привязаны к модели,
// ревизии платы и BIOS. Инструкции по конкретной модели ищем у её производителя.

export const SOURCES = {
  amdSpec: ['AMD · характеристики процессоров', 'https://www.amd.com/en/products/specifications/processors.html'],
  amdCpu: ['AMD · руководство Ryzen Master', 'https://docs.amd.com/r/en-US/68886-ryzen-master-user-guide/CPU'],
  amdWarning: ['AMD · условия работы за пределами спецификаций', 'https://docs.amd.com/r/en-US/68886-ryzen-master-user-guide/Warning'],
  intelTemp: ['Intel · где найти температурный предел процессора', 'https://www.intel.com/content/www/us/en/support/articles/000094759/processors.html'],
  intelCpu: ['Intel · требования к XTU', 'https://www.intel.com/content/www/us/en/support/articles/000006636/processors.html'],
  intelTest: ['Intel · исходный замер и проверка стабильности', 'https://www.intel.com/content/www/us/en/gaming/resources/how-to-overclock.html'],
  expo: ['AMD · EXPO и список проверенных комплектов', 'https://www.amd.com/en/products/processors/technologies/expo.html'],
  xmp: ['Intel · профили XMP и штатный режим JEDEC', 'https://www.intel.com/content/www/us/en/gaming/extreme-memory-profile-xmp.html'],
  memory: ['MSI · как найти список памяти и руководство платы', 'https://www.msi.com/support/technical_details/MB_Memory_Installation'],
  radeon: ['AMD · настройка Radeon и восстановление заводского профиля', 'https://www.amd.com/en/resources/support-articles/faqs/DH3-020.html'],
  nvidia: ['NVIDIA · мониторинг и автоматическая настройка', 'https://www.nvidia.com/en-us/software/nvidia-app/release-highlights/'],
  hwinfo: ['HWiNFO · датчики и отчёт', 'https://www.hwinfo.com/'],
  memtest: ['MemTest86 · проверка памяти', 'https://www.memtest86.com/'],
};

export const BIOS = [
  { id: 'asus', name: 'ASUS', match: /\basus\b|\brog\b|\btuf\b|proart|strix/i,
    support: ['ASUS · поиск по модели', 'https://www.asus.com/support/download-center/'],
    example: ['ASUS · примеры меню XMP, EXPO и DOCP', 'https://www.asus.com/support/faq/1042256/'] },
  { id: 'gigabyte', name: 'Gigabyte', match: /gigabyte|aorus|ds3h/i,
    support: ['Gigabyte · поиск по модели и ревизии', 'https://www.gigabyte.com/Support'] },
  { id: 'msi', name: 'MSI', match: /\bmsi\b|tomahawk|mortar/i,
    support: ['MSI · поиск по модели', 'https://www.msi.com/support'],
    example: ['MSI · как найти руководство BIOS своей платы', 'https://www.msi.com/support/technical_details/MB_BIOS_Manual'] },
  { id: 'asrock', name: 'ASRock', match: /asrock|taichi|steel legend/i,
    support: ['ASRock · поддержка плат', 'https://www.asrock.com/support/index.asp'],
    example: ['ASRock · проверенные комплекты памяти по платам', 'https://www.asrock.com/support/SupportList.asp?cat=Memory'] },
  { id: 'biostar', name: 'Biostar', match: /biostar/i,
    support: ['Biostar · руководства и версии BIOS', 'https://www.biostar.com.tw/app/en/support/download.php'] },
];

export const FOCUS = { cpu: 'Процессор', memory: 'Оперативная память', gpu: 'Видеокарта' };
export const GOALS = { stable: 'Проверить стабильность', quiet: 'Снизить шум или нагрев', speed: 'Повысить производительность' };

export const FIELDS = {
  cpu: ['Процессор', 'Полное название с суффиксом'],
  motherboard: ['Материнская плата', 'Полное название, включая Wi-Fi, DDR4 и другие обозначения'],
  boardRev: ['Ревизия платы', 'Маркировка на плате, если производитель её указывает'],
  bios: ['Версия BIOS', 'Из BIOS или «Сведений о системе» в Windows'],
  ramName: ['Название памяти в каталоге', 'Для справки. Артикул установленного комплекта проверьте на наклейке или в SPD'],
  ram: ['Артикул комплекта памяти', 'С наклейки, упаковки или отчёта SPD'],
  ramLayout: ['Комплект и занятые слоты', 'Число модулей, объём каждого и названия слотов по руководству'],
  ramIcs: ['Чипы и ревизия памяти', 'Из документации или SPD, если устройство их показывает'],
  gpu: ['Видеокарта', 'Полное название версии от производителя карты'],
  gpuDriver: ['Драйвер и VBIOS видеокарты', 'Текущие версии, если доступны'],
  cooler: ['Кулер или СЖО', 'Точная модель охлаждения'],
  psu: ['Блок питания', 'Точная модель и мощность с наклейки'],
  chassis: ['Корпус', 'Модель и установленные вентиляторы'],
  profile: ['Текущие настройки', 'Профиль памяти и уже изменённые параметры, если есть'],
  cpuIdle: ['Температура процессора в простое, °C', 'Показание датчика на штатных настройках'],
  cpuLoad: ['Температура процессора под нагрузкой, °C', 'Максимум в записанном тесте'],
  gpuIdle: ['Температура видеокарты в простое, °C', 'Показание датчика на штатных настройках'],
  gpuLoad: ['Температура видеокарты под нагрузкой, °C', 'Максимум температуры ядра в записанном тесте'],
  gpuHotspot: ['Самая горячая точка видеокарты, °C', 'Датчик Hot Spot, если он есть'],
  test: ['Нагрузка и результат теста', 'Название теста или игры, длительность, ошибки или вылеты'],
};

const PART_FIELDS = { cpu: 'cpu', motherboard: 'motherboard', ramName: 'ram', gpu: 'gpu', cooler: 'cooler', psu: 'psu', chassis: 'case' };
const RESET_FIELDS = ['boardRev', 'bios', 'ramLayout', 'ramIcs', 'gpuDriver', 'profile', 'cpuIdle', 'cpuLoad', 'gpuIdle', 'gpuLoad', 'gpuHotspot', 'test'];

export function cleanProfile(value = {}) {
  return Object.fromEntries(Object.keys(FIELDS).concat(['focus', 'goal']).flatMap((key) => {
    const field = typeof value?.[key] === 'string' ? value[key].trim().slice(0, 240) : '';
    if (!field || (key === 'focus' && !Object.hasOwn(FOCUS, field)) || (key === 'goal' && !Object.hasOwn(GOALS, field))) return [];
    if (/^(?:cpuIdle|cpuLoad|gpuIdle|gpuLoad|gpuHotspot)$/.test(key) && !/^[+-]?\d+(?:[.,]\d+)?$/.test(field)) return [];
    return [[key, field]];
  }));
}

export function partsForProfile(parts) {
  const found = Object.fromEntries(Object.entries(PART_FIELDS).map(([key, slot]) => [key, parts?.[slot]?.name]));
  return cleanProfile(found);
}

export function importProfile(profile, parts) {
  const into = { ...profile };
  const incoming = partsForProfile(parts);
  if (!Object.keys(incoming).length) return cleanProfile(into);
  const changed = Object.keys(PART_FIELDS).some((key) => (into[key] || '') !== (incoming[key] || ''));
  if (!changed) return cleanProfile(into);
  for (const key of [...Object.keys(PART_FIELDS), ...RESET_FIELDS, 'ram']) delete into[key];
  return cleanProfile({ ...into, ...incoming });
}

export function vendorOf(model) {
  return BIOS.find((vendor) => vendor.match.test(model || '')) || null;
}

export const GUIDES = [
  {
    id: 'baseline', title: 'Исходный замер',
    text: 'Уточните модели, запишите текущие настройки и снимите температуры в простое и под обычной для вас нагрузкой. Отдельно отметьте ошибки, вылеты и снижение частот из-за нагрева.',
    boundary: 'Сверяйте показания с пределом конкретного датчика и модели. При сбоях на штатных настройках сначала разберитесь с их причиной.',
    sources: [SOURCES.hwinfo, SOURCES.intelTest, SOURCES.amdWarning],
  },
  {
    id: 'bios', title: 'Материнская плата и BIOS',
    text: 'Найдите руководство платы, список совместимых процессоров и описание вашей версии BIOS. Для комплектного ПК используйте документацию производителя системы.',
    boundary: 'Учитывайте полную модель и ревизию. Способ обновления и возврата настроек берите из инструкции к этой плате.',
    sources: [SOURCES.memory, BIOS[2].example, BIOS[0].support],
  },
  {
    id: 'memory', title: 'Оперативная память',
    text: 'Сверьте артикул комплекта и число модулей со списком проверенной памяти для платы (QVL). SPD — сведения о модуле и его профилях, которые можно прочитать в BIOS или диагностической программе.',
    boundary: 'Штатный режим сверяйте с документацией процессора и платы. EXPO/XMP — профили разгона, их работа зависит от всей конфигурации. При ошибках вернитесь к проверенному штатному профилю.',
    sources: [SOURCES.expo, SOURCES.xmp, SOURCES.memory, SOURCES.memtest],
  },
  {
    id: 'cpu', title: 'Процессор',
    text: 'По точной модели найдите паспортные пределы и выясните, поддерживает ли процессор нужную функцию. Доступность Ryzen Master, Curve Optimizer и Intel XTU зависит от модели, платы и прошивки.',
    boundary: 'До проверки используйте штатные пределы модели и сохраняйте заводские защиты. Предел температуры — граница из паспорта, а целевая температура зависит от нагрузки и охлаждения.',
    sources: [SOURCES.amdSpec, SOURCES.amdCpu, SOURCES.amdWarning, SOURCES.intelTemp, SOURCES.intelCpu],
  },
  {
    id: 'gpu', title: 'Видеокарта',
    text: 'Найдите именно свою версию карты у её производителя. Запишите версию драйвера и температуры датчиков под привычной нагрузкой. Справки AMD и NVIDIA объясняют, где доступны штатные профили и мониторинг.',
    boundary: 'При сбоях верните штатный профиль. Пределы температуры ядра, горячей точки и памяти сверяйте отдельно с документацией конкретной карты.',
    sources: [SOURCES.radeon, SOURCES.nvidia, SOURCES.hwinfo],
  },
];

export function memoOf(input) {
  const profile = cleanProfile(input);
  const vendor = vendorOf(profile.motherboard);
  const missing = [];
  const required = ['cpu', 'motherboard', 'bios', 'ram', 'ramLayout', 'cooler', 'psu', 'test'];
  if (vendor?.id === 'gigabyte') required.push('boardRev');
  if (profile.focus === 'memory' && profile.goal === 'speed') required.push('ramIcs');
  if (profile.focus !== 'gpu') required.push('cpuIdle', 'cpuLoad');
  if (profile.focus === 'gpu') required.push('gpu', 'gpuDriver', 'gpuIdle', 'gpuLoad');
  if (!profile.focus) missing.push('Что хотите настроить');
  if (!profile.goal) missing.push('Цель');
  missing.push(...required.filter((key) => !profile[key]).map((key) => FIELDS[key][0]));
  return { profile, missing, vendor, guides: GUIDES.filter(({ id }) => id === 'baseline' || id === 'bios' || id === profile.focus) };
}

export function timingNs(cycles, mts) {
  return Number.isFinite(cycles) && Number.isFinite(mts) && cycles > 0 && mts > 0 ? cycles * 2000 / mts : null;
}

export function timingsAt(cycles, mts, target) {
  const ns = timingNs(cycles, mts);
  return ns !== null && Number.isFinite(target) && target > 0 ? Math.ceil(ns * target / 2000) : null;
}
