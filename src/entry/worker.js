'use strict';
/**
 * Cloudflare Worker 入口: 所有模型共用, 通过环境变量区分。
 * 部署时设置 APIBASE / SEARCH_SERVICE / SEARCH1API_KEY 等变量即可。
 */
import { handleChatRequest } from '../core/chat-handler.js';
import { getConfig, joinApiUrl } from '../core/config.js';
import { callChatCompletions, proxyRequest, UpstreamError, resolveApiKey } from '../core/upstream.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(res, status = 200, headers = {}) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...headers },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/') {
      return new Response('<html><head><meta charset="UTF-8"></head><body><h1>search2ai 让大模型自由联网</h1></body></html>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS },
      });
    }

    const authHeader = request.headers.get('Authorization');
    const requestKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    if (!requestKey) return json({ error: { message: 'Authorization header is missing' } }, 400);
    const { apiKey, authError } = resolveApiKey(requestKey);
    if (authError) return json({ error: { message: authError } }, 401);

    const cfg = getConfig();
    const isChat = url.pathname === '/v1/chat/completions' || url.pathname === '/chat/completions';

    try {
      if (isChat) {
        const requestData = await request.json();
        const result = await handleChatRequest(
          (body, stream) => callChatCompletions(fetch, apiKey, body, stream),
          requestData
        );
        return new Response(result.body, {
          status: result.status,
          headers: { ...CORS, ...result.headers },
        });
      }

      // 其它端点(如 /v1/models、音频)直接转发
      const upstream = await proxyRequest(fetch, apiKey, {
        method: request.method,
        urlPath: url.pathname,
        headers: request.headers,
        body: request.body,
      });
      return new Response(upstream.body, { status: upstream.status, headers: { ...CORS } });
    } catch (error) {
      const status = error instanceof UpstreamError ? error.status : 500;
      const message = error instanceof UpstreamError ? error.message : 'Internal Server Error';
      console.error('handleRequest error:', error);
      return json({ error: { message, type: 'upstream_error', code: status } }, status);
    }
  },
};
