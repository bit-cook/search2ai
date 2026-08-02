'use strict';
/**
 * 核心编排: 与运行时(Node/Worker)无关的聊天请求处理。
 * 流程: 注入搜索工具 → 调用上游模型 → 拦截 tool_calls → 执行搜索 → 二次调用生成最终回答。
 * 所有模型(OpenAI/Groq/Moonshot/Azure/火山方舟/Gemini兼容端点)共用此模块。
 */
const { getToolDefinitions, executeToolCall } = require('./search-tools');
const { joinApiUrl } = require('./config');

// 注入工具定义; 多模态内容(图片数组)不注入, 原样透传避免 400
function buildRequestBody(requestData, maxTokens) {
  const latestUser = [...requestData.messages].reverse().find((m) => m.role === 'user');
  const isContentArray = Array.isArray(latestUser && latestUser.content);
  const body = {
    model: requestData.model,
    messages: requestData.messages,
    max_tokens: maxTokens,
  };
  if (!isContentArray) {
    body.tools = getToolDefinitions();
    body.tool_choice = 'auto';
  }
  return body;
}

// 非流式路径: 循环"调用模型→执行工具"直至模型不再请求工具, 返回最终 JSON
async function handleNonStream(fetchFn, requestData, maxTokens) {
  const messages = [...requestData.messages];
  let usedTools = false;
  for (let round = 0; round < 8; round++) {
    // 第一轮注入工具定义, 后续轮次模型已知道工具, 无需重复注入
    const body = round === 0 ? buildRequestBody(requestData, maxTokens) : { model: requestData.model, messages };
    const data = await fetchFn(body, false);
    const message = data.choices && data.choices[0] && data.choices[0].message;
    if (!message) return { data, usedTools };
    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) return { data, usedTools }; // 无工具调用, 返回最终回答

    // 有工具调用: 回灌 messages 并执行工具, 进入下一轮
    usedTools = true;
    messages.push(message);
    for (const tc of toolCalls) {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch (e) {
        args = {};
      }
      const content = await executeToolCall(tc.function.name, args);
      messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content });
    }
  }
  // 超过轮数上限: 返回最后一次响应
  return { data: await fetchFn({ model: requestData.model, messages }, false), usedTools };
}

/**
 * 统一入口。fetchFn 由运行时注入, 签名: async (body, stream) => Response
 * 返回: { status, headers, body, bodyIsStream }
 */
async function handleChatRequest(fetchFn, requestData) {
  const stream = !!requestData.stream;
  const maxTokens = requestData.max_tokens || 3000;

  // 流式请求: 先非流式探测工具调用, 再按需二次调用(兼容无流式工具解析的模型)
  if (stream) {
    const { data: nonStreamData, usedTools } = await handleNonStream(fetchFn, requestData, maxTokens);
    if (usedTools) {
      // 发生过工具调用: handleNonStream 已拿到最终回答, 转成 SSE 输出
      return {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: jsonToSse(nonStreamData),
        bodyIsStream: true,
      };
    }
    // 无工具调用: 直接透传上游流(注意补回 stream: true, 否则上游按非流式处理)
    const resp = await fetchFn({ ...buildRequestBody(requestData, maxTokens), stream: true }, true);
    return { status: resp.status, headers: { 'Content-Type': 'text/event-stream' }, body: resp.body, bodyIsStream: true };
  }

  // 非流式
  const { data } = await handleNonStream(fetchFn, requestData, maxTokens);
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    bodyIsStream: false,
  };
}

// 将完整 JSON 响应转换为 SSE 流(逐字符输出, 兼容客户端)
function jsonToSse(data) {
  const encoder = new TextEncoder();
  const characters = Array.from(
    (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
  );
  let i = 0;
  return new ReadableStream({
    start(controller) {
      function push() {
        if (i < characters.length) {
          const chunk = {
            id: data.id,
            object: 'chat.completion.chunk',
            created: data.created,
            model: data.model,
            choices: [
              {
                index: 0,
                delta: { content: characters[i] },
                logprobs: null,
                finish_reason: i === characters.length - 1 ? 'stop' : null,
              },
            ],
            system_fingerprint: data.system_fingerprint,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          i++;
          setTimeout(push, 5);
        } else {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
      push();
    },
  });
}

module.exports = { handleChatRequest, buildRequestBody };
