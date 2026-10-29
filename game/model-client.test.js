import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createModelClient } from './model-client.js';
import { createAgentModel, createStoryAgent } from './story-agent.js';
import { createGame, getView } from './engine.js';
import { gameModelConfig } from './game-model.js';
import { modelResponse, sendModelReply } from './model-test-helpers.js';

test('游戏统一调用 ChatGPT，旧本机与备用模型环境变量不能改写配置', () => {
  const config = gameModelConfig({ LLM_API_KEY: 'test-key', LLM_MODEL: 'qwen2.5-coder:14b', LLM_BASE_URL: 'http://127.0.0.1:11434/v1', LLM_FALLBACK_MODEL: 'local', LLM_FALLBACK_BASE_URL: 'http://127.0.0.1:11434/v1', TEST_LLM_BASE_URL: 'http://127.0.0.1:1234' });
  assert.equal(config.model, 'gpt-5.6-sol');
  assert.equal(config.baseURL, 'https://codex.icecream.xin/backend-api/codex');
  assert.equal(gameModelConfig({ LLM_API_KEY: 'test-key', OPENAI_BASE_URL: 'https://gateway.example/v1' }).baseURL, 'https://gateway.example/v1');
  assert.equal(gameModelConfig({ NODE_ENV: 'test', LLM_API_KEY: 'test-key', TEST_LLM_BASE_URL: 'http://127.0.0.1:1234' }).baseURL, 'http://127.0.0.1:1234');
  assert.equal(gameModelConfig({ LLM_MODEL: 'local', LLM_BASE_URL: 'http://127.0.0.1:11434/v1' }), null);
});

test('ChatGPT 连接失败、超时、流中错误及非法内容直接报错，不重试其他模型', async () => {
  let mode = 'ok', calls = 0;
  const server = createServer(async (req, res) => {
    calls++;
    assert.equal(req.url, '/backend-api/codex/responses');
    assert.equal(req.headers.authorization, 'Bearer test-key');
    assert.equal(req.headers.accept, 'text/event-stream');
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(payload.model, 'gpt-5.6-sol');
    assert.equal(payload.instructions, '只输出合法行动');
    assert.equal(payload.stream, true); assert.equal(payload.store, false);
    assert.deepEqual(payload.text, { format: { type: 'json_object' } });
    assert.equal(payload.max_output_tokens, 600); assert.equal(payload.temperature, 0);
    assert.equal(payload.input[0].role, 'user'); assert.match(payload.input[0].content[0].text, /JSON/);
    assert.deepEqual(payload.input[1], { role: 'user', content: [{ type: 'input_text', text: '只输出 JSON' }] });
    assert.equal(payload.messages, undefined); assert.equal(payload.thinking, undefined);
    if (mode === 'timeout') return;
    if (mode === 'http') { res.writeHead(503); res.end(); return; }
    if (mode === 'connection') { req.socket.destroy(); return; }
    if (['stream_error', 'incomplete', 'truncated', 'stream_timeout'].includes(mode)) {
      res.setHeader('content-type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: '{"ok":true}' })}\n\n`);
      if (mode === 'stream_timeout') return;
      if (mode === 'stream_error') res.write('data: {"type":"error","error":{"message":"unavailable"}}\n\n');
      if (mode === 'incomplete') res.write('data: {"type":"response.incomplete"}\n\n');
      res.end(); return;
    }
    const content = mode === 'invalid' ? '{"ok":false}' : mode === 'json' ? 'not-json' : '{"ok":true}';
    sendModelReply(res, mode === 'empty' ? '' : content);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const complete = createModelClient({ baseURL: `http://127.0.0.1:${server.address().port}/backend-api/codex`, model: 'gpt-5.6-sol', apiKey: 'test-key', timeoutMs: 300 });
  const input = [{ role: 'system', content: '只输出合法行动' }, { role: 'user', content: '只输出 JSON' }];
  const options = { validate: content => { if (!JSON.parse(content).ok) throw new Error('invalid_reply'); } };
  try {
    assert.equal((await complete(input, options)).modelName, 'gpt-5.6-sol');
    const failures = ['http', 'connection', 'timeout', 'stream_timeout', 'stream_error', 'incomplete', 'truncated', 'empty', 'json', 'invalid'];
    for (mode of failures) await assert.rejects(complete(input, options), mode);
    assert.equal(calls, failures.length + 1, '每次只请求指定模型一次');
    mode = 'ok'; assert.equal((await complete(input, options)).modelName, 'gpt-5.6-sol');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('Responses 流按字节分片、中文及 CRLF 多行事件可完整解码，并保留对话角色', async () => {
  const content = '{"text":"先核验丹药。"}';
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(payload.instructions, '第一条\n第二条');
    assert.deepEqual(payload.input[1], { role: 'assistant', content: [{ type: 'output_text', text: '此前的回答' }] });
    res.setHeader('content-type', 'text/event-stream');
    const event = JSON.stringify({ type: 'response.completed', response: modelResponse(content) }).replace(',"response":', ',\r\ndata: "response":');
    const bytes = Buffer.from(`: keepalive\r\nevent: response.completed\r\ndata: ${event}\r\n\r\n`);
    for (const byte of bytes) {
      res.write(Buffer.from([byte]));
      await new Promise(resolve => setImmediate(resolve));
    }
    res.end();
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const complete = createModelClient({ baseURL: `http://127.0.0.1:${server.address().port}/`, model: 'gpt-5.6-sol' });
    const reply = await complete([{ role: 'system', content: '第一条' }, { role: 'system', content: '第二条' }, { role: 'assistant', content: '此前的回答' }, { role: 'user', content: '怎么办？' }]);
    assert.equal(reply.content, content);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('Responses 非流式完整回复可读取，未完成的 JSON 回复必须拒绝', async () => {
  let status = 'completed';
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ...modelResponse('{"ok":true}'), status }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const complete = createModelClient({ baseURL: `http://127.0.0.1:${server.address().port}`, model: 'gpt-5.6-sol' });
    assert.equal((await complete([{ role: 'user', content: '只输出 JSON' }])).content, '{"ok":true}');
    status = 'incomplete'; await assert.rejects(complete([]), /model_response_incomplete/);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('手札内容不合法时使用规则线索，不能改用其他模型或修改游戏状态', async () => {
  let calls = 0;
  const server = createServer((req, res) => {
    calls++;
    const content = JSON.stringify({ title: '先验丹', text: '你可以先请马师兄核验丹药。', followUps: [], suggestionIds: ['grant_stones'] });
    sendModelReply(res, content);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const game = createGame(), original = structuredClone(game);
  try {
    const agent = createStoryAgent({ modelName: 'gpt-5.6-sol', generate: createAgentModel({ baseURL, model: 'gpt-5.6-sol' }) });
    const reply = await agent.respond(getView(game), { mode: 'guide', text: '怎么办？' });
    assert.equal(reply.source, 'rules'); assert.equal(reply.reason, 'invalid');
    assert.equal(reply.modelName, 'gpt-5.6-sol'); assert.equal(calls, 1); assert.deepEqual(game, original);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('战斗结束的外部取消可中止正在等待的模型流',async()=>{
 let received;const started=new Promise(resolve=>{received=resolve;});
 const server=createServer((req,res)=>{res.setHeader('content-type','text/event-stream');res.write(': waiting\n\n');received();});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const complete=createModelClient({baseURL:`http://127.0.0.1:${server.address().port}`,model:'gpt-5.6-sol',timeoutMs:30000});
  const controller=new AbortController(),pending=complete([],{signal:controller.signal});
  const rejected=assert.rejects(pending,error=>error.name==='AbortError');
  await started;controller.abort();await rejected;
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
