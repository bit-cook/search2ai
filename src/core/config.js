'use strict';
/**
 * 统一配置读取: 兼容 Node(process.env) 与 Cloudflare Worker(全局变量) 两种环境。
 * 所有环境变量在此集中定义默认值, 业务代码不再直接读环境变量。
 */

// 规整 API Base: 兼容"根地址"(https://api.openai.com)与"已含 /v1 等版本段"的地址
// (如火山方舟 /api/v3、Gemini OpenAI 兼容端点 /v1beta/openai), 统一返回拼好 /v1 后的 base
function normalizeApiBase(apiBase) {
  let base = String(apiBase || '').replace(/\/+$/, '');
  if (!base) return 'https://api.openai.com/v1';
  if (/\/v\d+$/i.test(base)) return base;
  if (/\/openai$/i.test(base)) return base + '/v1';
  return base + '/v1';
}

// 拼接 base 与请求路径: 规整后的 base 已含 /v1, 请求路径也可能含 /v1(如 /v1/models), 去掉重复段
function joinApiUrl(apiBase, pathname) {
  let base = String(apiBase || '').replace(/\/+$/, '');
  let path = String(pathname || '');
  const baseHasV = /\/v\d+$/i.test(base);
  const pathHasV = /^\/v\d+\//i.test(path);
  if (baseHasV && pathHasV) {
    return base + path.replace(/^\/v\d+/, '');
  }
  return base + path;
}

function getEnv(name) {
  // Node 环境: process.env; Worker 环境: 全局变量
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] !== 'undefined') {
    return process.env[name];
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined') {
    return globalThis[name];
  }
  return undefined;
}

function getConfig() {
  const rawApiBase = getEnv('APIBASE') || '';
  const apiBase = normalizeApiBase(rawApiBase);
  const isGemini = /generativelanguage\.googleapis\.com/i.test(rawApiBase);
  return {
    apiBase,                    // 规整后的 base(已含 /v1)
    rawApiBase,
    isGemini,                   // 是否为 Gemini OpenAI 兼容端点
    openaiType: getEnv('OPENAI_TYPE') || 'openai',   // openai | azure
    // 请求鉴权: AUTH_KEYS 逗号分隔的允许 key 列表; 配置后请求 key 必须在列表中,
    // 上游改用 OPENAI_API_KEY(openai) / AZURE_API_KEY(azure)。留空则透传请求 key
    authKeys: (getEnv('AUTH_KEYS') || '').split(',').map((s) => s.trim()).filter(Boolean),
    openaiApiKey: getEnv('OPENAI_API_KEY') || '',
    // Azure OpenAI(OPENAI_TYPE=azure 时生效)
    azureResource: getEnv('RESOURCE_NAME') || '',
    azureDeploy: getEnv('DEPLOY_NAME') || '',
    azureApiVersion: getEnv('API_VERSION') || '',
    azureApiKey: getEnv('AZURE_API_KEY') || '',
    maxResults: getEnv('MAX_RESULTS') || '5',
    crawlResults: getEnv('CRAWL_RESULTS') || '0',
    searchService: getEnv('SEARCH_SERVICE') || '',
    // 各搜索源 key
    search1apiKey: getEnv('SEARCH1API_KEY') || '',
    googleCx: getEnv('GOOGLE_CX') || '',
    googleKey: getEnv('GOOGLE_KEY') || '',
    serpapiKey: getEnv('SERPAPI_KEY') || '',
    serperKey: getEnv('SERPER_KEY') || '',
    bingKey: getEnv('BING_KEY') || '',
    searxngBaseUrl: getEnv('SEARXNG_BASE_URL') || '',
    gl: getEnv('GL') || 'us',
    hl: getEnv('HL') || 'en',
  };
}

module.exports = { getConfig, normalizeApiBase, joinApiUrl, getEnv };
