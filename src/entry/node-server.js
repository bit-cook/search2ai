'use strict';
/**
 * Node 入口: 本地 / Zeabur / Vercel 部署。
 * 与 Cloudflare Worker 共享同一套 core, 仅 HTTP 适配层不同。
 */
const http = require('http');
const path = require('path');
const { config } = require('dotenv');
const { handleChatRequest } = require('../core/chat-handler');
const { getConfig, joinApiUrl } = require('../core/config');
const { callChatCompletions, proxyRequest, UpstreamError, resolveApiKey } = require('../core/upstream');

// 加载 .env.local(本地测试优先) 与 .env
config({ path: path.join(__dirname, '..', '..', '.env.local') });
config({ path: path.join(__dirname, '..', '..', '.env') });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
  'Access-Control-Max-Age': '86400',
};

async function handleRequest(req, res) {
  const url = req.url.split('?')[0];
  if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...CORS });
    res.end('<html><head><meta charset="UTF-8"></head><body><h1>search2ai 让大模型自由联网</h1></body></html>');
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const authHeader = req.headers['authorization'] || '';
  const requestKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!requestKey) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ error: { message: 'Authorization header is missing' } }));
    return;
  }
  const { apiKey, authError } = resolveApiKey(requestKey);
  if (authError) {
    res.writeHead(401, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ error: { message: authError } }));
    return;
  }

  const cfg = getConfig();
  const isChat = url === '/v1/chat/completions' || url === '/chat/completions';

  try {
    if (isChat) {
      const requestData = req.body;
      const fetchFn = (url, options) => fetch(url, options);
      const result = await handleChatRequest(
        (body, stream) => callChatCompletions(fetchFn, apiKey, body, stream),
        requestData
      );
      const headers = { ...CORS, ...result.headers };
      if (result.bodyIsStream) {
        res.writeHead(result.status, headers);
        if (typeof result.body.pipe === 'function') {
          result.body.pipe(res);
        } else {
          // Web ReadableStream → Node 响应
          const reader = result.body.getReader();
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
              }
              res.end();
            } catch (e) {
              console.error('stream error:', e);
              res.destroy(e);
            }
          })();
        }
      } else {
        res.writeHead(result.status, headers);
        res.end(result.body);
      }
      return;
    }

    // 其它端点(如 /v1/models、音频)直接转发
    const upstream = await proxyRequest(fetch, apiKey, {
      method: req.method,
      urlPath: url,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    });
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, { ...CORS, 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
    res.end(buffer);
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 500;
    const message = error instanceof UpstreamError ? error.message : 'Internal Server Error';
    console.error('handleRequest error:', error);
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: { message, type: 'upstream_error', code: status } }));
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const isAudio = req.url.startsWith('/v1/audio/');
      try {
        req.body = isAudio ? raw : JSON.parse(raw.toString());
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
        return;
      }
      handleRequest(req, res);
    });
  } else {
    handleRequest(req, res);
  }
});

const PORT = process.env.PORT || 3014;
server.listen(PORT, () => console.log(`search2ai listening on ${PORT}`));
