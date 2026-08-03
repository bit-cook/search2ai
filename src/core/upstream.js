'use strict';
/**
 * 上游请求封装: 统一处理 OpenAI / Azure OpenAI 的鉴权头、URL 与错误透传。
 * Node 与 Cloudflare Worker 共用; fetch 由运行时提供。
 */
const { getConfig, joinApiUrl } = require('./config');

class UpstreamError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * 解析请求鉴权:
 * - AUTH_KEYS 配置了允许列表时, 校验请求 key ∈ 列表(不区分大小写),
 *   通过后上游改用 OPENAI_API_KEY(openai) / AZURE_API_KEY(azure);
 * - 未配置 AUTH_KEYS 时, 直接透传请求 key。
 * 返回 { apiKey, authError }; authError 非空表示校验失败。
 */
function resolveApiKey(requestKey) {
  const cfg = getConfig();
  if (cfg.authKeys.length > 0) {
    const allowed = cfg.authKeys.some((k) => k.toLowerCase() === String(requestKey || '').toLowerCase());
    if (!allowed) {
      return { apiKey: '', authError: 'Invalid API key' };
    }
    const configured = cfg.openaiType === 'azure' ? cfg.azureApiKey : cfg.openaiApiKey;
    return { apiKey: configured || requestKey };
  }
  return { apiKey: requestKey };
}

/**
 * 构造 chat/completions 请求参数(headers/url/body)。
 * openai: APIBASE + /chat/completions, Bearer 头(APIBASE 已含版本段, 与 SDK 一致)
 * azure:  https://{RESOURCE_NAME}.openai.azure.com/openai/deployments/{DEPLOY_NAME}/chat/completions?api-version={API_VERSION}, api-key 头
 */
function buildChatRequestOptions(apiKey, stream) {
  const cfg = getConfig();
  const headers = {
    'Content-Type': 'application/json',
    Accept: stream ? 'text/event-stream' : 'application/json',
  };
  let url;
  if (cfg.openaiType === 'azure') {
    const resource = cfg.azureResource || 'xxxxx';
    const deploy = cfg.azureDeploy || 'gpt-35-turbo';
    const ver = cfg.azureApiVersion || '2024-03-01-preview';
    url = `https://${resource}.openai.azure.com/openai/deployments/${deploy}/chat/completions?api-version=${ver}`;
    headers['api-key'] = cfg.azureApiKey || apiKey;
  } else {
    url = joinApiUrl(cfg.apiBase, '/chat/completions');
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return { url, headers };
}

/** 调用上游 chat/completions; stream=true 返回 Response, 否则返回解析后的 JSON */
async function callChatCompletions(fetchFn, apiKey, body, stream) {
  const { url, headers } = buildChatRequestOptions(apiKey, stream);
  const upstream = await fetchFn(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!upstream.ok) {
    let detail = upstream.statusText || '';
    try {
      const e = await upstream.json();
      detail = (e.error && e.error.message) || JSON.stringify(e);
    } catch (_) {}
    throw new UpstreamError(upstream.status, detail);
  }
  return stream ? upstream : await upstream.json();
}

/** 非 chat 端点(如 /v1/models、音频)直接转发; req 需含 method/urlPath/headers/body */
async function proxyRequest(fetchFn, apiKey, req) {
  const cfg = getConfig();
  const headers = new Headers(req.headers);
  headers.delete('host');
  if (cfg.openaiType === 'azure') {
    headers.set('api-key', cfg.azureApiKey || apiKey);
  } else {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }
  const upstream = await fetchFn(joinApiUrl(cfg.apiBase, req.urlPath), {
    method: req.method,
    headers,
    body: req.body,
  });
  return upstream;
}

module.exports = { UpstreamError, buildChatRequestOptions, callChatCompletions, proxyRequest, resolveApiKey };
