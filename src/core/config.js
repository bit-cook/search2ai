'use strict';
/**
 * 统一配置读取: 兼容 Node(process.env) 与 Cloudflare Worker(全局变量) 两种环境。
 * 所有环境变量在此集中定义默认值, 业务代码不再直接读环境变量。
 */

// APIBASE 语义与 OpenAI SDK 一致: 填 provider 文档里的完整前缀(host + 版本段),
// 如 https://api.openai.com/v1、https://ark.cn-beijing.volces.com/api/v3、
// https://generativelanguage.googleapis.com/v1beta/openai。不自动补版本号。
function normalizeApiBase(apiBase) {
  const base = String(apiBase || '').replace(/\/+$/, '');
  return base || 'https://api.openai.com/v1';
}

// 拼接 base 与请求路径(与 OpenAI SDK 一致: baseURL + 端点路径)
function joinApiUrl(apiBase, pathname) {
  const base = String(apiBase || '').replace(/\/+$/, '');
  const path = String(pathname || '').replace(/^\/+/, '');
  return `${base}/${path}`;
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
