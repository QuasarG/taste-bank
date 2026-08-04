// HTTP API 封装：所有打 tastebank.cloud 的请求都走这里
// v0.2：消费端走 pack 端点（完整包）+ 3 天缓存；投稿侧走签名 POST/PUT/DELETE

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
 * 通用请求：支持任意 method/body/headers。带超时。
 * @param {string} path - 相对路径
 * @param {{method?: string, body?: string, headers?: Record<string,string>, accept?: string, signal?: AbortSignal}} [opts]
 * @returns {Promise<{ok: boolean, status: number, text: string}>}
 */
export async function apiRequest(path, opts = {}) {
  const url = API_BASE + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const signal = opts.signal ?? controller.signal;

  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: { accept: opts.accept ?? 'application/json', ...(opts.headers || {}) },
      body: opts.body,
      signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ApiError(`请求超时（${TIMEOUT_MS / 1000}s）——服务器可能不可达或响应过慢：${url}`, { url });
    }
    // 区分错误类型，给出可操作的提示
    const cause = e.cause;
    let hint = '网络错误';
    if (cause?.code === 'ENOTFOUND' || cause?.code === 'EAI_AGAIN') {
      hint = 'DNS 解析失败——检查网络连接或 DNS 设置';
    } else if (cause?.code === 'ECONNREFUSED') {
      hint = '连接被拒绝——服务器端口未开放或防火墙拦截';
    } else if (cause?.code === 'ECONNRESET') {
      hint = '连接被重置——网络不稳定或中间代理拦截';
    } else if (cause?.code === 'CERT_HAS_EXPIRED' || cause?.code === 'CERT_NOT_YET_VALID' || cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      hint = 'SSL 证书问题——服务器证书无效或已过期';
    } else if (cause?.code === 'ECONNABORTED' || /timeout/i.test(String(cause?.message || ''))) {
      hint = '连接超时——网络受限或服务器不可达';
    } else if (e.message === 'fetch failed') {
      hint = '网络不可达——可能是沙箱/防火墙限制，或服务器离线';
    } else {
      hint = e.message;
    }
    throw new ApiError(`${hint}（${url}）\n  如持续失败，检查网络或运行 taste-bank doctor 诊断`, { url, cause: cause?.code });
  } finally {
    clearTimeout(timer);
  }
}

/** 向后兼容：apiGet = apiRequest GET-only */
export async function apiGet(path, opts = {}) {
  return apiRequest(path, { accept: opts.accept, signal: opts.signal });
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

// ---------- v0.2：完整 pack + 缓存 ----------

const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 天

/**
 * 取完整风格包：{ meta, tokens, skill, css, templates: {name:content}, version }
 * 走 3 天缓存 + 服务器挂时 fallback 到缓存。
 * @param {string} slug
 * @returns {Promise<{data: object, source: 'cache'|'live'|'stale-cache'}>}
 */
export async function getStylePack(slug) {
  const { getCache, setCache } = await import('./cache.mjs');
  const cached = getCache(slug);

  // 缓存有效期内直接用
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { data: cached.data, source: 'cache' };
  }

  // 缓存过期或不存在 → 拉新的
  try {
    const data = await apiJson(`/api/styles/${encodeURIComponent(slug)}/pack.json`);
    setCache(slug, data);
    return { data, source: 'live' };
  } catch (e) {
    // 服务器挂了，fallback 到过期缓存（如有）+ 提示
    if (cached) {
      return { data: cached.data, source: 'stale-cache', warning: `使用缓存（服务器不可达：${e.message}）` };
    }
    throw e;
  }
}

/** 直接拉完整包，不走缓存（某些场景需要强制 live） */
export async function getStylePackLive(slug) {
  return apiJson(`/api/styles/${encodeURIComponent(slug)}/pack.json`);
}

// ---------- v0.2：投稿侧签名请求 ----------
// 致命细节：submit/update 的签名必须基于请求体的原始字节，
// 所以 JSON.stringify 只一次，签名和发送共用这个字符串。

/**
 * 投稿（POST）。需要 inviteCode + privateKey。
 * @param {object} packObj - { meta, tokens, skill, overrides?, templates?, ownerPubkey }
 * @param {{inviteCode: string, privateKey: string}} auth
 * @returns {Promise<{slug, files, status, payloadHash}>}
 */
export async function submitStyle(packObj, { inviteCode, privateKey }) {
  const { canonicalMessage, signMessage, payloadHash } = await import('./auth.mjs');
  const raw = JSON.stringify(packObj); // 只序列化一次
  const timestamp = String(Date.now());
  const signature = signMessage(canonicalMessage('submit', packObj.meta.slug, timestamp, raw), privateKey);
  const result = await signedRequest('POST', '/api/styles.json', raw, {
    'x-invite-code': inviteCode,
    'x-timestamp': timestamp,
    'x-signature': signature,
    'content-type': 'application/json',
  });
  // 附带本地计算的 hash，供 submit 命令与服务端 payloadHash 对比
  return { ...result, localPayloadHash: payloadHash(raw) };
}

/**
 * 更新（PUT）。owner 签名，无需 invite。
 * @param {string} slug
 * @param {object} packObj
 * @param {{privateKey: string}} auth
 */
export async function updateStyle(slug, packObj, { privateKey }) {
  const { canonicalMessage, signMessage } = await import('./auth.mjs');
  const raw = JSON.stringify(packObj);
  const timestamp = String(Date.now());
  const signature = signMessage(canonicalMessage('update', slug, timestamp, raw), privateKey);
  return signedRequest('PUT', `/api/styles/${encodeURIComponent(slug)}.json`, raw, {
    'x-timestamp': timestamp,
    'x-signature': signature,
    'content-type': 'application/json',
  });
}

/**
 * 删除（DELETE）。payload 为空字符串。
 * @param {string} slug
 * @param {{privateKey: string}} auth
 */
export async function deleteStyle(slug, { privateKey }) {
  const { canonicalMessage, signMessage } = await import('./auth.mjs');
  const timestamp = String(Date.now());
  const signature = signMessage(canonicalMessage('delete', slug, timestamp, ''), privateKey);
  return signedRequest('DELETE', `/api/styles/${encodeURIComponent(slug)}.json`, '', {
    'x-timestamp': timestamp,
    'x-signature': signature,
  });
}

/**
 * 查身份（GET，仅 inviteCode 头）。
 * @param {string} inviteCode
 * @returns {Promise<{bound, author, styles, pending, note}>}
 */
export async function whoami(inviteCode) {
  const { ok, status, text } = await apiRequest('/api/whoami.json', {
    headers: { 'x-invite-code': inviteCode },
  });
  if (!ok) {
    let detail = text;
    try { detail = JSON.parse(text).error || text; } catch { /* 保留 */ }
    throw new ApiError(`API ${status}：${detail}`, { status, url: API_BASE + '/api/whoami.json' });
  }
  return JSON.parse(text);
}

/** 签名请求内部封装：发送 + 解析响应（201/200 成功，其他抛错） */
async function signedRequest(method, path, body, headers) {
  const { ok, status, text } = await apiRequest(path, { method, body, headers });
  if (!ok) {
    let detail = text;
    try { detail = JSON.parse(text).error || text; } catch { /* 保留 */ }
    throw new ApiError(`API ${status}：${detail}`, { status, url: API_BASE + path });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(`响应不是合法 JSON：${text.slice(0, 200)}`, { status });
  }
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
