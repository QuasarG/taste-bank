// HTTP API 封装：所有打 tastebank.cloud 的请求都走这里
// v1 只用公开 GET 端点（list/show/skill/css），无鉴权头

// 默认指向官方站；自部署/测试可用 TASTEBANK_API 环境变量覆盖
export const API_BASE = (process.env.TASTEBANK_API || 'https://tastebank.cloud').replace(/\/$/, '');

const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status, url } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

/**
 * 带超时的 fetch 封装。
 * @param {string} path - 相对路径（如 /api/styles.json）
 * @param {{accept?: string, signal?: AbortSignal}} [opts]
 * @returns {Promise<{ok: boolean, status: number, text: string}>}
 */
export async function apiGet(path, opts = {}) {
  const url = API_BASE + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // 允许外部 signal 协同取消，但超时一定生效
  const signal = opts.signal ?? controller.signal;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: opts.accept ?? 'application/json' },
      signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ApiError(`请求超时（${TIMEOUT_MS / 1000}s）：${url}`, { url });
    }
    throw new ApiError(`网络错误：${e.message}（${url}）`, { url });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 取 JSON 端点。非 2xx 抛 ApiError（含服务端 {error} 字段）。
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function apiJson(path) {
  const { ok, status, text } = await apiGet(path, { accept: 'application/json' });
  if (!ok) {
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.error || text;
    } catch {
      /* 保留原始 text */
    }
    throw new ApiError(`API ${status}：${detail}`, { status, url: API_BASE + path });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(`响应不是合法 JSON：${text.slice(0, 200)}`, { status, url: API_BASE + path });
  }
}

/**
 * 取文本端点（skill.md / tokens.css）。非 2xx 抛 ApiError。
 * @param {string} path
 * @param {string} accept
 * @returns {Promise<string>}
 */
export async function apiText(path, accept) {
  const { ok, status, text } = await apiGet(path, { accept });
  if (!ok) {
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.error || text;
    } catch {
      /* 保留原始 */
    }
    throw new ApiError(`API ${status}：${detail}`, { status, url: API_BASE + path });
  }
  return text;
}

// ---------- 业务封装（端点固定，调用方只传业务参数）----------

/** 列全部风格，可选关键词过滤。返回 { count, styles: [{slug,name,version,mood,useCase,summary}] } */
export function listStyles(q) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiJson(`/api/styles.json${qs}`);
}

/** 取单个风格详情：{ meta, tokens, files } */
export function getStyle(slug) {
  return apiJson(`/api/styles/${encodeURIComponent(slug)}.json`);
}

/** 取组装好的 SKILL.md 全文（也增计数） */
export function getSkillMarkdown(slug) {
  return apiText(`/api/styles/${encodeURIComponent(slug)}/skill.md`, 'text/markdown');
}

/** 取 scoped CSS 变量块（含 overrides） */
export function getStyleCss(slug) {
  return apiText(`/api/styles/${encodeURIComponent(slug)}/tokens.css`, 'text/css');
}

/** liveness 探测 */
export async function ping() {
  try {
    const { ok } = await apiGet('/api/ping');
    return ok;
  } catch {
    return false;
  }
}
