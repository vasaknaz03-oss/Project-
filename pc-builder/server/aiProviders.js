'use strict';

const PROVIDERS = {
  anthropic: { label: 'Claude (Anthropic)', keyRequired: true, keyUrl: 'https://console.anthropic.com/settings/keys' },
  openai: { label: 'OpenAI GPT', kind: 'openai', url: 'https://api.openai.com/v1', model: 'gpt-6-luna', fixedUrl: true, keyRequired: true, keyUrl: 'https://platform.openai.com/api-keys' },
  deepseek: { label: 'DeepSeek', kind: 'openai', url: 'https://api.deepseek.com', model: 'deepseek-flash', fixedUrl: true, keyRequired: true, keyUrl: 'https://platform.deepseek.com/api_keys' },
  ollama: { label: 'Ollama', kind: 'ollama', url: 'http://127.0.0.1:11434', model: 'qwen3:8b' },
  lmstudio: { label: 'LM Studio', kind: 'openai', url: 'http://127.0.0.1:1234/v1' },
  custom: { label: 'Свой OpenAI-совместимый адрес', kind: 'openai' },
  server: { label: 'Сервер ПодборПК' },
};

function identify(url, kind) {
  const addr = new URL((/^https?:\/\//i.test(url) ? '' : 'http://') + url);
  if (addr.origin === 'https://api.openai.com') return 'openai';
  if (addr.origin === 'https://api.deepseek.com') return 'deepseek';
  if (kind === 'ollama' || (!kind && addr.port === '11434')) return 'ollama';
  if (addr.port === '1234') return 'lmstudio';
  return 'custom';
}

module.exports = { PROVIDERS, identify };
