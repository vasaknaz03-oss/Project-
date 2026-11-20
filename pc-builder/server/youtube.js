'use strict';
// YouTube Data API v3 (бесплатный ключ пользователя): обзоры и гайды по запросу и комментарии зрителей.

const { getJSON } = require('./http');
const secrets = require('./secrets');

const API = process.env.YOUTUBE_API || 'https://www.googleapis.com/youtube/v3';

function key() {
  const k = secrets.get('youtubeKey');
  if (!k) {
    const e = new Error('Для видео нужен бесплатный ключ YouTube Data API: «Настройки» → «ИИ-помощник и YouTube».');
    e.code = 'NO_KEY';
    throw e;
  }
  return k;
}

function available() {
  return !!secrets.get('youtubeKey');
}

const decode = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function call(path, params) {
  const qs = new URLSearchParams({ ...params, key: key() });
  try {
    return await getJSON(`${API}/${path}?${qs}`, { ttl: 6 * 60 * 60 * 1000, retries: 1 });
  } catch (e) {
    if (e.status === 400 || e.status === 403) throw new Error('YouTube не принял ключ или исчерпан дневной лимит (10 000 единиц). Проверьте ключ в «Настройках».');
    throw e;
  }
}

/** Видео по запросу (до 8) и лучшие комментарии к первым трём. */
async function search(q, { comments = true, lang = 'ru' } = {}) {
  q = String(q || '').trim().slice(0, 200);
  if (!q) throw new Error('Пустой запрос');
  const data = await call('search', { part: 'snippet', type: 'video', q, maxResults: '8', relevanceLanguage: lang, safeSearch: 'moderate' });
  const videos = (data.items || []).map((it) => ({
    id: it.id && it.id.videoId,
    title: decode(it.snippet.title),
    channel: decode(it.snippet.channelTitle),
    date: it.snippet.publishedAt,
    description: decode(it.snippet.description).slice(0, 240),
    thumb: it.snippet.thumbnails && (it.snippet.thumbnails.medium || it.snippet.thumbnails.default || {}).url,
    url: it.id && it.id.videoId ? `https://www.youtube.com/watch?v=${it.id.videoId}` : null,
    comments: [],
  })).filter((v) => v.id);
  if (comments) {
    await Promise.all(videos.slice(0, 3).map(async (v) => {
      try {
        const c = await call('commentThreads', { part: 'snippet', videoId: v.id, maxResults: '6', order: 'relevance', textFormat: 'plainText' });
        v.comments = (c.items || []).map((x) => {
          const s = x.snippet.topLevelComment.snippet;
          return { author: decode(s.authorDisplayName), text: decode(s.textDisplay).slice(0, 400), likes: s.likeCount || 0 };
        });
      } catch {
        // комментарии бывают отключены — это не ошибка
      }
    }));
  }
  return { videos };
}

module.exports = { search, available };
