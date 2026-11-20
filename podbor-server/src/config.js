'use strict';
// Настройки сервера — только из переменных окружения (файл .env на сервере, в репозиторий не попадает).

const num = (v, d) => (v === undefined || v === '' || isNaN(+v) ? d : +v);
const env = process.env;

// Лимиты в сутки на одно устройство. «pro» — заготовка под платную подписку.
const PLANS = {
  free: {
    research_quick: num(env.LIMIT_FREE_RESEARCH, 5),
    research_deep: num(env.LIMIT_FREE_RESEARCH_DEEP, 1),
    reviews: num(env.LIMIT_FREE_REVIEWS, 20),
    youtube: num(env.LIMIT_FREE_YOUTUBE, 40),
    kufar_scan: num(env.LIMIT_FREE_KUFAR_SCANS, 40),
    fetch: num(env.LIMIT_FREE_FETCH, 5000),
    notify: num(env.LIMIT_FREE_NOTIFY, 100),
  },
  pro: {
    research_quick: num(env.LIMIT_PRO_RESEARCH, 50),
    research_deep: num(env.LIMIT_PRO_RESEARCH_DEEP, 15),
    reviews: num(env.LIMIT_PRO_REVIEWS, 200),
    youtube: num(env.LIMIT_PRO_YOUTUBE, 200),
    kufar_scan: num(env.LIMIT_PRO_KUFAR_SCANS, 200),
    fetch: num(env.LIMIT_PRO_FETCH, 20000),
    notify: num(env.LIMIT_PRO_NOTIFY, 500),
  },
};

module.exports = {
  port: num(env.PORT, 8080),
  host: env.HOST || '0.0.0.0',
  dataDir: env.DATA_DIR || require('path').join(__dirname, '..', 'data'),
  trustProxy: env.TRUST_PROXY === '1', // за Caddy/nginx — брать IP из X-Forwarded-For
  adminToken: env.ADMIN_TOKEN || '',
  anthropicKey: env.ANTHROPIC_API_KEY || '',
  // Вместо Anthropic — своя модель (Ollama на этом же сервере) или OpenAI-совместимый сервис.
  // Если задан ANTHROPIC_API_KEY, он главнее.
  llm: env.AI_BASE_URL && env.AI_MODEL
    ? { url: env.AI_BASE_URL, model: env.AI_MODEL, key: env.AI_API_KEY || '', kind: ['ollama', 'openai'].includes(env.AI_KIND) ? env.AI_KIND : '' }
    : null,
  youtubeKey: env.YOUTUBE_API_KEY || '',
  telegramToken: env.TELEGRAM_BOT_TOKEN || '',
  telegramApi: env.TELEGRAM_API || 'https://api.telegram.org',
  // Общий дневной бюджет на ИИ в долларах: когда исчерпан, ИИ-запросы до полуночи (UTC) отклоняются
  aiDailyBudgetUsd: num(env.AI_DAILY_BUDGET_USD, 5),
  // Цены для оценки расходов (проверьте актуальные на anthropic.com/pricing)
  priceInputPerM: num(env.PRICE_INPUT_PER_M, 4),
  priceOutputPerM: num(env.PRICE_OUTPUT_PER_M, 20),
  priceWebSearchPer1k: num(env.PRICE_WEB_SEARCH_PER_1K, 10),
  // Сколько хранить общий кэш
  ttl: {
    research: num(env.TTL_RESEARCH_DAYS, 7) * 86400e3,
    reviews: num(env.TTL_REVIEWS_DAYS, 14) * 86400e3,
    // Правила YouTube API: данные нельзя хранить дольше ~30 дней без обновления; храним сутки
    youtube: Math.min(num(env.TTL_YOUTUBE_HOURS, 24), 24 * 29) * 3600e3,
  },
  registerPerIpHour: num(env.REGISTER_PER_IP_HOUR, 10),
  maxBody: 256 * 1024,
  plans: PLANS,
};
