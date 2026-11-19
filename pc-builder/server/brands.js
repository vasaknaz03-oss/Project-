'use strict';
// Качество брендов по категориям. Малоизвестные (часто китайский noname или перемаркировка)
// получают штраф в оценке подбора: берутся, только если заметно дешевле. «Только известные бренды» их исключает.

const NONAME = {
  videocard: /sinotex|ninja|afox|pcwinmax|kissin|\bcbr\b|ocpc|arktek|soyo|jieshuo|mllse|veineda|szmz|yeston|kllisre|machinist/i,
  motherboard: /jginyue|esonic|afox|arktek|kllisre|machinist|huananzhi|soyo|qiyida|atermiter/i,
  dram: /kingbank|kingprice|foxline|digma|kingfast|hikvision|asgard|gloway|kllisre|juhor|walram|\bagi\b|\bcbr\b|exegate|ankowall|azerty|qumo|dato|neo ?forza|atrix|tecmiyo|kingspec|biwin|fanxiang|netac|vaseky|kingmax|\bjuhor\b|machinist|amd radeon r\d/i,
  ssd: /foxline|kingspec|kingfast|3drw|kingprice|hikvision|\bagi\b|dahua|pc pet|amd radeon r\d|exegate|\bcbr\b|digma|qumo|smartbuy|mirex|ocpc|fanxiang|biwin|kingbank|asgard|walram|netac|colorful|ankowall|gloway|kllisre|vaseky|tecmiyo|gigastone|maxsun/i,
  chassis: /exegate|ginzzu|digma|\bcbr\b|accord|crown|kingprice|powercase|3cott|linkworld|oklick|frime|delux|\bacd\b|formula|navitoch|sven/i,
};

// Явно проверенные бренды (если в названии есть и то и другое — считаем известным)
const KNOWN = {
  dram: /kingston|corsair|g\.?skill|crucial|samsung|adata|\bxpg\b|teamgroup|team group|t-force|patriot|\bpny\b|silicon[ -]?power|lexar|apacer|micron|hynix|geil|goodram|transcend|thermaltake|v-color|mushkin|gigabyte|aorus|\bmsi\b|\basus\b|acer predator|\bhp\b/i,
  ssd: /samsung|western digital|\bwd\b|crucial|kingston|adata|\bxpg\b|hynix|solidigm|seagate|lexar|teamgroup|team group|t-force|patriot|\bmsi\b|gigabyte|aorus|transcend|sandisk|corsair|apacer|silicon[ -]?power|\bpny\b|intel|kioxia|toshiba|micron|goodram|plextor|mushkin|synology|acer|\bhp\b|\basus\b/i,
};

// Для памяти и SSD — «белый список»: всё, чего нет среди проверенных брендов, считаем малоизвестным
const WHITELIST = new Set(['dram', 'ssd']);

function isNoname(cat, name) {
  const n = name || '';
  if (WHITELIST.has(cat)) return !KNOWN[cat].test(n);
  const re = NONAME[cat];
  if (!re || !re.test(n)) return false;
  return !(KNOWN[cat] && KNOWN[cat].test(n));
}

// Штраф к оценке сборки за малоизвестный бренд
const PENALTY = { videocard: 0.86, motherboard: 0.985, dram: 0.94, ssd: 0.95, chassis: 0.985 };

module.exports = { isNoname, PENALTY, NONAME, KNOWN };
