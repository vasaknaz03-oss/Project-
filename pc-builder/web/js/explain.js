// «Почему эта деталь» — объяснение выбора простыми словами для тех, кто не разбирается в железе.
// Только факты из характеристик и расчётов приложения, без рекламы.

/* global Compat */

const gb = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)} ТБ` : `${v} ГБ`);

function cpuWhy(it, parts) {
  const s = it.specs || {};
  const out = [];
  if (it.perf) {
    const g = it.perf.gaming;
    out.push(`В играх — ${g} баллов, в работе (рендер, архивы, компиляция) — ${it.perf.multi}. За 100 принят Ryzen 5 5600 — популярный «народный» игровой процессор.`);
    if (g >= 125) out.push('Это уровень топовых игровых процессоров: не будет «бутылочным горлышком» даже для мощной видеокарты.');
    else if (g >= 100) out.push('Хватает для любых современных игр с видеокартой среднего и высокого класса.');
    else if (g >= 80) out.push('Подходит для игр в 1080p; с очень мощной видеокартой может немного её сдерживать.');
    else out.push('Начальный уровень: офис, учёба, нетребовательные игры.');
  }
  if (/x3d/i.test(it.name)) out.push('X3D — процессор с увеличенным кэшем: в играх это одна из самых быстрых линеек. Греется сильнее обычных — поэтому к нему подобран кулер с запасом.');
  if (s.cores) out.push(`${s.cores} ядер / ${s.threads || s.cores} потоков: ${s.cores >= 8 ? 'запас на годы, стримы и тяжёлые программы' : s.cores >= 6 ? 'современный стандарт для игр' : 'для игр сегодня уже впритык'}.`);
  if (s.socket === 'AM5') out.push('Платформа AM5: AMD обещает выпускать под неё процессоры ещё несколько лет — потом можно будет заменить только процессор.');
  else if (s.socket === 'AM4') out.push('Платформа AM4 — старая, но очень выгодная: дешёвые платы и память DDR4. Новых процессоров под неё почти не будет.');
  else if (s.socket === 'LGA1700') out.push('Платформа LGA1700: последнее поколение для этого сокета, апгрейд только в пределах 12–14 поколений Intel.');
  else if (s.socket === 'LGA1851') out.push('Новая платформа Intel LGA1851 (Core Ultra).');
  if (s.hasIgpu === false && !parts.gpu) out.push('⚠ Встроенной графики нет — без видеокарты не будет изображения.');
  else if (s.hasIgpu === false) out.push('Встроенной графики нет (буква F) — это нормально, если есть видеокарта: так дешевле.');
  if (s.withCooler) out.push('Кулер в комплекте — для повседневной работы его хватает.');
  return out;
}

function gpuWhy(it, parts) {
  const s = it.specs || {};
  const out = [];
  if (it.perf && it.perf.score) {
    out.push(`Индекс производительности ${it.perf.score} (RTX 4060 = 100). ${Compat.gamingTier(it.perf.score)}.`);
    const cpu = parts.cpu && parts.cpu.perf;
    if (cpu && it.perf.score > cpu.gaming * 1.8) out.push('Видеокарта заметно мощнее процессора — в некоторых играх процессор её будет сдерживать.');
  }
  if (s.vramGb) {
    out.push(`${s.vramGb} ГБ видеопамяти: ${s.vramGb >= 16 ? 'с запасом для 1440p/4K и новых игр' : s.vramGb >= 12 ? 'хорошо для 1440p' : s.vramGb >= 8 ? 'нормально для 1080p, в новых играх на ультра-текстурах может не хватать' : 'мало для современных игр'}.`);
  }
  if (/rtx/i.test(it.name)) out.push('NVIDIA RTX: есть DLSS (повышает FPS почти без потери картинки) и хорошая трассировка лучей.');
  else if (/rx\s?9\d{3}/i.test(it.name)) out.push('Radeon RX 9000: FSR 4, хорошая трассировка для AMD, обычно выгоднее NVIDIA по цене за кадр.');
  else if (/\brx\b/i.test(it.name)) out.push('Radeon: часто больше кадров за те же деньги, чем у NVIDIA, но слабее в трассировке лучей.');
  if (s.boardWatts) out.push(`Потребление по характеристикам карты — ${s.boardWatts} Вт.`);
  else if (it.perf?.watts) out.push(`Для расчёта мощности блока питания использована оценка около ${it.perf.watts} Вт.`);
  if (s.lengthMm) out.push(`Длина карты — ${s.lengthMm} мм.`);
  if (s.thicknessMm) out.push(`Толщина карты — ${s.thicknessMm} мм.`);
  return out;
}

function boardWhy(it, parts) {
  const s = it.specs || {};
  const out = [];
  if (s.socket) out.push(`Сокет ${s.socket}${s.chipset ? `, чипсет ${s.chipset}` : ''} — подходит к выбранному процессору.`);
  if (s.phases) {
    const cpuW = parts.cpu ? Compat.cpuPower(parts.cpu) : 0;
    out.push(`Питание процессора: ${s.phases} фаз. ${s.phases >= 12 ? 'Это мощная схема с запасом — не перегревается даже с топовыми процессорами.' : s.phases >= 8 ? 'Достаточно для процессоров среднего уровня.' : cpuW > 150 ? '⚠ Для мощного процессора маловато — VRM может греться.' : 'Скромная схема, но для этого процессора хватает.'}`);
  }
  if (s.m2) out.push(`${s.m2} слот(а) M.2 для быстрых SSD${s.m2 >= 2 ? ' — можно будет добавить второй накопитель' : ''}.`);
  if (s.memSlots) out.push(`${s.memSlots} слота памяти ${s.mem || ''}${s.memSlots >= 4 ? ' — можно докупить ещё пару модулей' : ''}.`);
  if (s.wifi) out.push('Встроенный Wi-Fi и Bluetooth — не нужен отдельный адаптер.');
  else out.push('Без Wi-Fi: нужен кабель от роутера или USB-адаптер.');
  if (s.form) out.push(`Формат ${s.form}${s.form === 'mATX' ? ' — компактнее, но меньше слотов расширения' : s.form === 'ATX' ? ' — полноразмерная, больше разъёмов' : ''}.`);
  return out;
}

function ramWhy(it, parts) {
  const s = it.specs || {};
  const out = [];
  if (s.totalGb) out.push(`${s.totalGb} ГБ: ${s.totalGb >= 64 ? 'для тяжёлой работы — монтаж, 3D, виртуальные машины' : s.totalGb >= 32 ? 'современный комфортный объём для игр и работы, хватит на годы' : s.totalGb >= 16 ? 'минимум для современных игр' : 'мало — браузер и игры будут тормозить'}.`);
  if (s.modules >= 2) out.push(`Модулей в комплекте — ${s.modules}. Рекомендуемые слоты указаны в руководстве платы.`);
  else if (s.modules === 1) out.push('В комплекте одна планка.');
  if (s.mhz) {
    out.push(`Скорость по карточке комплекта — ${s.mhz} МТ/с${s.cl ? `, CL${s.cl}` : ''}.`);
    out.push('Поддержку этой скорости и профиля памяти проверьте по артикулу комплекта и документации платы во вкладке «Разгон».');
  }
  return out;
}

function ssdWhy(it) {
  const s = it.specs || {};
  const out = [];
  if (s.capacityGb) out.push(`${gb(s.capacityGb)}: ${s.capacityGb >= 2000 ? 'много игр сразу' : s.capacityGb >= 1000 ? '8–12 современных игр плюс система' : 'система и 2–4 игры — со временем может не хватить'}.`);
  if (s.iface === 'NVMe') out.push(`NVMe${s.pcie ? ` PCIe ${s.pcie}.0` : ''}${s.read ? `, чтение до ${s.read} МБ/с` : ''} — в разы быстрее SATA: система и игры загружаются быстро.`);
  else if (s.iface === 'SATA') out.push('SATA — медленнее NVMe, но всё равно намного быстрее жёсткого диска.');
  if (s.qlc) out.push('⚠ Память QLC: при долгой записи больших файлов скорость сильно падает. Для игр это не критично.');
  return out;
}

function psuWhy(it, parts) {
  const s = it.specs || {};
  const out = [];
  const need = Compat.psuNeed(parts.cpu, parts.gpu);
  if (s.watts) out.push(`${s.watts} Вт при расчётной нагрузке ~${need.load} Вт (процессор ${Compat.cpuPower(parts.cpu)} Вт в пике${parts.gpu ? ` + видеокарта ${Compat.gpuPower(parts.gpu)} Вт` : ''} + остальное). ${s.watts >= need.rec ? 'Запас достаточный: блок не будет работать на пределе и шуметь.' : '⚠ Запас небольшой.'}`);
  if (s.cert) out.push(`Сертификат 80 PLUS ${s.certName || ''}: ${s.cert >= 3 ? 'высокий КПД — меньше нагрев и шум' : 'базовый КПД'}.`);
  else out.push('Без сертификата 80 PLUS — КПД неизвестен, обычно это бюджетные блоки.');
  if (s.modular === 'full') out.push('Полностью модульный: лишние кабели не мешают в корпусе.');
  else if (s.modular === 'semi') out.push('Полумодульный: часть кабелей отстёгивается.');
  if (s.pcie5) out.push('Есть разъём 12V-2x6 (12VHPWR) для новых видеокарт — без переходников.');
  out.push('Блок питания — деталь, на которой нельзя экономить: от него зависит безопасность всех остальных.');
  return out;
}

function coolerWhy(it) {
  const out = Compat.coolerLabels(it).map((text) => text + '.');
  if (!it.specs?.dissipationWatts) out.push('В характеристиках не указана рассеиваемая мощность.');
  return out;
}

function caseWhy(it, parts) {
  const s = it.specs || {};
  const out = [];
  if (s.boards && s.boards.length) out.push(`Поддерживает платы ${s.boards.join(', ')} — выбранная влезает.`);
  if (s.gpuMaxMm) out.push(`Корпус поддерживает видеокарты длиной до ${s.gpuMaxMm} мм.`);
  if (s.coolerMaxMm) out.push(`Кулер процессора до ${s.coolerMaxMm} мм.`);
  if (s.fans > 0) out.push(`Вентиляторов в комплекте — ${s.fans}.`);
  if (s.mesh) out.push('Сетчатая передняя панель.');
  if (s.window) out.push('Боковое окно — видно комплектующие.');
  return out;
}

const BY_SLOT = { cpu: cpuWhy, gpu: gpuWhy, motherboard: boardWhy, ram: ramWhy, ssd: ssdWhy, psu: psuWhy, cooler: coolerWhy, case: caseWhy };

/** Список пояснений для детали в сборке. */
export function explainPart(slotKey, it, parts) {
  const fn = BY_SLOT[slotKey];
  if (!fn || !it) return [];
  try {
    const out = fn(it, parts || {});
    if (it.reviews >= 3 && it.rating) out.push(`Покупатели на Onliner ставят ${it.rating.toFixed(1)} из 5 (${it.reviews} отзывов) — подробности по кнопке «Отзывы».`);
    if (it.noname) out.push('Малоизвестный производитель: выбран из-за цены, но гарантийное обслуживание может быть сложнее.');
    return out;
  } catch {
    return [];
  }
}
