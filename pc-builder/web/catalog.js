// Каталог разделов: что ищем, где это лежит на Onliner (категория + предустановленные фильтры)
// и на Kufar (категория + тип). Общий для сервера и интерфейса.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Catalog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GROUPS = [
    { id: 'pc', name: 'Комплектующие ПК' },
    { id: 'laptop', name: 'Ноутбуки и комплектующие для них' },
    { id: 'monitor', name: 'Мониторы' },
    { id: 'periph', name: 'Периферия' },
    { id: 'workspace', name: 'Рабочее место' },
    { id: 'net', name: 'Сеть и питание' },
  ];

  // onliner: категория каталога Onliner; onlinerPreset: фильтры, которые раздел ставит всегда
  // kufar: { cat, p: { параметр: значение } } — категория и тип на Kufar; kufarQuery — если подходящей категории нет
  const SECTIONS = [
    { id: 'cpu', group: 'pc', name: 'Процессоры', icon: 'cpu', onliner: 'cpu', kufar: { cat: 16010, p: { cct: '10' } } },
    { id: 'videocard', group: 'pc', name: 'Видеокарты', icon: 'gpu', onliner: 'videocard', kufar: { cat: 16010, p: { cct: '11' } } },
    { id: 'motherboard', group: 'pc', name: 'Материнские платы', icon: 'board', onliner: 'motherboard', kufar: { cat: 16010, p: { cct: '7' } } },
    { id: 'dram', group: 'pc', name: 'Оперативная память', icon: 'ram', onliner: 'dram', kufar: { cat: 16010, p: { cct: '9' } } },
    { id: 'ssd', group: 'pc', name: 'SSD', icon: 'ssd', onliner: 'ssd', kufar: { cat: 16010, p: { cct: '15' } } },
    { id: 'hdd', group: 'pc', name: 'Жёсткие диски', icon: 'hdd', onliner: 'hdd', kufar: { cat: 16010, p: { cct: '13' } } },
    { id: 'powersupply', group: 'pc', name: 'Блоки питания', icon: 'psu', onliner: 'powersupply', kufar: { cat: 16010, p: { cct: '5' } } },
    { id: 'chassis', group: 'pc', name: 'Корпуса', icon: 'case', onliner: 'chassis', kufar: { cat: 16010, p: { cct: '1' } } },
    { id: 'fan', group: 'pc', name: 'Охлаждение', icon: 'fan', onliner: 'fan', kufar: { cat: 16010, p: { cct: '3' } } },
    { id: 'soundcard', group: 'pc', name: 'Звуковые карты', icon: 'speaker', onliner: 'soundcard', kufar: { cat: 16010, p: { cct: '17' } } },
    { id: 'pc_ready', group: 'pc', name: 'Готовые компьютеры', icon: 'case', onliner: 'desktoppc', kufar: { cat: 16020 } },

    { id: 'notebook', group: 'laptop', name: 'Ноутбуки', icon: 'laptop', onliner: 'notebook', kufar: { cat: 16040 } },
    { id: 'nb_ram', group: 'laptop', name: 'Память для ноутбуков (SO-DIMM)', icon: 'ram', onliner: 'dram', onlinerPreset: { dramkit: ['ddr3sodimm', 'ddr4sodimm', 'ddr5sodimm'] }, kufar: { cat: 16010, p: { cct: '9' } }, kufarQuery: 'so-dimm' },
    { id: 'nb_ssd', group: 'laptop', name: 'SSD для ноутбуков (M.2 и 2.5")', icon: 'ssd', onliner: 'ssd', onlinerPreset: { form_ssd: ['m2', '25'] }, kufar: { cat: 16010, p: { cct: '15' } } },
    { id: 'notebatteries', group: 'laptop', name: 'Аккумуляторы и зарядки для ноутбуков', icon: 'psu', onliner: 'notebatteries', kufar: { cat: 16010, p: { cct: '5' } }, kufarQuery: 'ноутбук' },
    { id: 'laptopstand', group: 'laptop', name: 'Подставки и охлаждение для ноутбуков', icon: 'laptop', onliner: 'laptopstand', kufar: { cat: 16060, p: { catt: '45' } } },
    { id: 'nb_parts', group: 'laptop', name: 'Ноутбуки на запчасти', icon: 'laptop', onliner: null, kufar: { cat: 16010, p: { cct: '8' } } },
    { id: 'nb_bags', group: 'laptop', name: 'Сумки и рюкзаки для ноутбуков', icon: 'laptop', onliner: null, kufar: { cat: 16060, p: { catt: '13' } } },

    { id: 'display', group: 'monitor', name: 'Мониторы', icon: 'monitor', onliner: 'display', kufar: { cat: 16030 } },
    { id: 'wallmount', group: 'monitor', name: 'Кронштейны для мониторов', icon: 'monitor', onliner: 'wallmount', kufar: null, kufarQuery: 'кронштейн для монитора' },

    { id: 'keyboards', group: 'periph', name: 'Клавиатуры', icon: 'keyboard', onliner: 'keyboards', kufar: { cat: 16060, p: { catt: '17' } } },
    { id: 'mouse', group: 'periph', name: 'Мыши', icon: 'mouse', onliner: 'mouse', kufar: { cat: 16060, p: { catt: '15' } } },
    { id: 'mousepad', group: 'periph', name: 'Коврики для мыши', icon: 'mouse', onliner: 'mousepad', kufar: { cat: 16060, p: { catt: '16' } } },
    { id: 'headphones', group: 'periph', name: 'Наушники и гарнитуры', icon: 'headphones', onliner: 'headphones', kufar: { cat: 5100 } },
    { id: 'microphones', group: 'periph', name: 'Микрофоны', icon: 'mic', onliner: 'microphones', kufar: null, kufarQuery: 'микрофон' },
    { id: 'webcams', group: 'periph', name: 'Веб-камеры', icon: 'webcam', onliner: 'webcams', kufar: { cat: 16060, p: { catt: '9' } } },
    { id: 'sound', group: 'periph', name: 'Колонки и акустика', icon: 'speaker', onliner: 'sound', kufar: { cat: 16060, p: { catt: '1' } } },
    { id: 'controllers', group: 'periph', name: 'Геймпады и рули', icon: 'gamepad', onliner: 'controllers', kufar: null, kufarQuery: 'геймпад' },
    { id: 'tablets', group: 'periph', name: 'Графические планшеты', icon: 'mouse', onliner: 'tablets', kufar: null, kufarQuery: 'графический планшет' },
    { id: 'usbhub', group: 'periph', name: 'USB-хабы и док-станции', icon: 'plug', onliner: 'usbhub', kufar: { cat: 16060, p: { catt: '25' } } },
    { id: 'externalhdd', group: 'periph', name: 'Внешние накопители', icon: 'hdd', onliner: 'externalhdd', kufar: { cat: 16060, p: { catt: '7' } } },

    { id: 'office_chair', group: 'workspace', name: 'Кресла', icon: 'chair', onliner: 'office_chair', kufar: { cat: 21130, p: { fcht: '15' } } },
    { id: 'table', group: 'workspace', name: 'Компьютерные столы', icon: 'desk', onliner: 'table', kufar: null, kufarQuery: 'компьютерный стол' },
    { id: 'desk_lamp', group: 'workspace', name: 'Настольные лампы', icon: 'sun', onliner: 'desk_lamp', kufar: null, kufarQuery: 'настольная лампа' },

    { id: 'wrouter', group: 'net', name: 'Роутеры', icon: 'router', onliner: 'wrouter', kufar: { cat: 16070 } },
    { id: 'wirelessadapter', group: 'net', name: 'Wi-Fi адаптеры', icon: 'router', onliner: 'wirelessadapter', kufar: null, kufarQuery: 'wi-fi адаптер' },
    { id: 'ups', group: 'net', name: 'ИБП', icon: 'plug', onliner: 'ups', kufar: { cat: 16060, p: { catt: '40' } } },
    { id: 'voltageregulator', group: 'net', name: 'Сетевые фильтры и удлинители', icon: 'plug', onliner: 'voltageregulator', kufar: { cat: 16060, p: { catt: '50' } } },
  ];

  // Сетап: что можно добавить к ПК в подборе по бюджету.
  // share — доля общего бюджета, min/max — разумные границы цены в BYN.
  const SETUP = [
    { id: 'display', label: 'Монитор', icon: 'monitor', share: 0.16, min: 250, max: 3500 },
    { id: 'keyboards', label: 'Клавиатура', icon: 'keyboard', share: 0.03, min: 40, max: 500 },
    { id: 'mouse', label: 'Мышь', icon: 'mouse', share: 0.025, min: 30, max: 400 },
    { id: 'headphones', label: 'Наушники', icon: 'headphones', share: 0.035, min: 50, max: 700 },
    { id: 'mousepad', label: 'Коврик', icon: 'mouse', share: 0.008, min: 15, max: 150 },
    { id: 'sound', label: 'Колонки', icon: 'speaker', share: 0.02, min: 40, max: 700 },
    { id: 'webcams', label: 'Веб-камера', icon: 'webcam', share: 0.015, min: 40, max: 400 },
    { id: 'microphones', label: 'Микрофон', icon: 'mic', share: 0.025, min: 60, max: 800 },
    { id: 'office_chair', label: 'Кресло', icon: 'chair', share: 0.08, min: 200, max: 2000 },
    { id: 'table', label: 'Стол', icon: 'desk', share: 0.06, min: 150, max: 1500 },
  ];

  const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
  const setupById = Object.fromEntries(SETUP.map((s) => [s.id, s]));
  const ONLINER_SCHEMAS = new Set(SECTIONS.map((s) => s.onliner).filter(Boolean));

  function setupTarget(id, budget) {
    const s = setupById[id];
    if (!s) return 0;
    return Math.min(s.max, Math.max(s.min, budget * s.share));
  }

  return { GROUPS, SECTIONS, SETUP, byId, setupById, ONLINER_SCHEMAS, setupTarget };
});
