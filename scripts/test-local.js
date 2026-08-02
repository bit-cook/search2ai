#!/usr/bin/env node
/**
 * 本地端到端测试脚本
 *
 * 用法:
 *   node scripts/test-local.js            # 使用 .env.local 中的配置
 *   node scripts/test-local.js --verbose  # 打印完整响应
 *
 * 前置:
 *   1. 复制 .env.local.example 为 .env.local, 填入大模型 key 与搜索服务 key
 *   2. 确保端口 3014 未被占用(可用 PORT=xxxx node scripts/test-local.js 指定)
 */
const { spawn } = require('child_process');
const http = require('http');
const { config } = require('dotenv');
const path = require('path');

// 显式加载 .env.local(优先) 与 .env, 供测试参数使用
config({ path: path.join(__dirname, '..', '.env.local') });
config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 3014;
const API_BASE = process.env.APIBASE || 'https://api.openai.com';
const API_KEY = process.env.TEST_OPENAI_KEY || '';
const MODEL = process.env.TEST_MODEL || 'gpt-4o-mini';
const VERBOSE = process.argv.includes('--verbose');

const serverProc = spawn('node', [path.join(__dirname, '..', 'src', 'entry', 'node-server.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
serverProc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

let serverReady = false;
serverProc.stdout.on('data', (d) => {
  const text = d.toString();
  if (text.includes('listening')) serverReady = true;
  if (VERBOSE) process.stdout.write(`[server] ${text}`);
});

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function postChat(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode, raw }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function summarize(raw) {
  try {
    const data = JSON.parse(raw);
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    const text = (msg && msg.content) || '';
    const toolCalls = (msg && msg.tool_calls) || [];
    return {
      ok: data.error ? false : true,
      error: data.error ? (data.error.message || JSON.stringify(data.error)) : undefined,
      textLen: text.length,
      preview: text.slice(0, 80).replace(/\n/g, ' '),
      toolCalls: toolCalls.map((t) => t.function && t.function.name).filter(Boolean),
      usage: data.usage,
    };
  } catch (e) {
    return { ok: false, error: `响应解析失败: ${e.message}`, preview: raw.slice(0, 120) };
  }
}

async function run() {
  if (!API_KEY) {
    console.error('✗ 未配置 TEST_OPENAI_KEY。请先复制 .env.local.example 为 .env.local 并填入大模型 API Key。');
    serverProc.kill();
    process.exit(1);
  }

  console.log('═══════════ search2ai 本地端到端测试 ═══════════');
  console.log(`  上游: ${API_BASE}  模型: ${MODEL}  端口: ${PORT}`);
  console.log(`  搜索服务: ${process.env.SEARCH_SERVICE || '(未设置)'}`);
  console.log('────────────────────────────────────────────────');

  // 等待服务就绪
  for (let i = 0; i < 50; i++) {
    if (serverReady) break;
    await sleep(200);
  }
  if (!serverReady) {
    console.error('✗ 本地服务未在预期时间内启动');
    serverProc.kill();
    process.exit(1);
  }
  console.log('✓ 本地服务已启动\n');

  const results = [];

  // 场景 1: 触发联网搜索的问题
  console.log('▶ 场景 1: 触发联网搜索(今日新闻)');
  try {
    const r = await postChat({
      model: MODEL,
      messages: [{ role: 'user', content: '请搜索一下今天的重要新闻，并简要总结三条，附上来源。' }],
    });
    const s = summarize(r.raw);
    results.push({ name: '触发联网搜索', ...s, status: r.status });
    console.log(`   HTTP ${r.status} | ${s.ok ? '✓ 回答生成' : '✗ 失败'} | 长度 ${s.textLen}`);
    if (s.toolCalls && s.toolCalls.length) console.log(`   工具调用: ${s.toolCalls.join(', ')}`);
    if (s.preview) console.log(`   回答预览: ${s.preview}...`);
    if (s.error) console.log(`   错误: ${s.error}`);
  } catch (e) {
    results.push({ name: '触发联网搜索', ok: false, error: e.message });
    console.log(`   ✗ 请求异常: ${e.message}`);
  }

  console.log('');

  // 场景 2: 不触发搜索的普通问题
  console.log('▶ 场景 2: 普通对话(无需搜索)');
  try {
    const r = await postChat({
      model: MODEL,
      messages: [{ role: 'user', content: '1+1等于几？直接回答。' }],
    });
    const s = summarize(r.raw);
    results.push({ name: '普通对话', ...s, status: r.status });
    console.log(`   HTTP ${r.status} | ${s.ok ? '✓ 回答生成' : '✗ 失败'} | 长度 ${s.textLen}`);
    if (s.preview) console.log(`   回答预览: ${s.preview}...`);
    if (s.error) console.log(`   错误: ${s.error}`);
  } catch (e) {
    results.push({ name: '普通对话', ok: false, error: e.message });
    console.log(`   ✗ 请求异常: ${e.message}`);
  }

  console.log('\n────────────────────────────────────────────────');
  const pass = results.filter((r) => r.ok).length;
  console.log(`结果: ${pass}/${results.length} 通过`);
  for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    console.log(`  ${mark} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
  }

  serverProc.kill();
  process.exit(pass === results.length ? 0 : 1);
}

run().catch((e) => {
  console.error('测试异常:', e);
  serverProc.kill();
  process.exit(1);
});
