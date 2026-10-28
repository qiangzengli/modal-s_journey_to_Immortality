import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createModelClient } from './model-client.js';
import { createAgentModel, createStoryAgent } from './story-agent.js';
import { createGame, getView } from './engine.js';
import { gameModelConfig } from './game-model.js';

test('游戏固定调用 DeepSeek，旧本机与备用模型环境变量不能改写配置', () => {
  const config = gameModelConfig({ LLM_API_KEY: 'test-key', LLM_MODEL: 'qwen2.5-coder:14b', LLM_BASE_URL: 'http://127.0.0.1:11434/v1', LLM_FALLBACK_MODEL: 'local', LLM_FALLBACK_BASE_URL: 'http://127.0.0.1:11434/v1', TEST_LLM_BASE_URL: 'http://127.0.0.1:1234' });
  assert.equal(config.model, 'deepseek-v4-flash');
  assert.equal(config.baseURL, 'https://api.deepseek.com');
  assert.equal(gameModelConfig({ LLM_MODEL: 'local', LLM_BASE_URL: 'http://127.0.0.1:11434/v1' }), null);
});

test('DeepSeek 连接失败、超时及非法内容直接报错，不重试其他模型', async () => {
  let mode = 'ok', calls = 0;
  const server = createServer(async (req, res) => {
    calls++;
    assert.equal(req.headers.authorization, 'Bearer test-key');
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(payload.model, 'deepseek-v4-flash');
    assert.deepEqual(payload.thinking, { type: 'disabled' });
    if (mode === 'timeout') return;
    if (mode === 'http') { res.writeHead(503); res.end(); return; }
    if (mode === 'connection') { req.socket.destroy(); return; }
    const content = mode === 'invalid' ? '{"ok":false}' : mode === 'json' ? 'not-json' : '{"ok":true}';
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const complete = createModelClient({ baseURL: `http://127.0.0.1:${server.address().port}`, model: 'deepseek-v4-flash', apiKey: 'test-key', timeoutMs: 100 });
  const input = [{ role: 'user', content: '只输出 JSON' }];
  const options = { validate: content => { if (!JSON.parse(content).ok) throw new Error('invalid_reply'); } };
  try {
    assert.equal((await complete(input, options)).modelName, 'deepseek-v4-flash');
    for (mode of ['http', 'connection', 'timeout', 'json', 'invalid']) await assert.rejects(complete(input, options));
    assert.equal(calls, 6, '每次只请求指定模型一次');
    mode = 'ok'; assert.equal((await complete(input, options)).modelName, 'deepseek-v4-flash');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('手札内容不合法时使用规则线索，不能改用其他模型或修改游戏状态', async () => {
  let calls = 0;
  const server = createServer((req, res) => {
    calls++;
    const content = JSON.stringify({ title: '先验丹', text: '你可以先请马师兄核验丹药。', followUps: [], suggestionIds: ['grant_stones'] });
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const game = createGame(), original = structuredClone(game);
  try {
    const agent = createStoryAgent({ modelName: 'deepseek-v4-flash', generate: createAgentModel({ baseURL, model: 'deepseek-v4-flash' }) });
    const reply = await agent.respond(getView(game), { mode: 'guide', text: '怎么办？' });
    assert.equal(reply.source, 'rules'); assert.equal(reply.reason, 'invalid');
    assert.equal(reply.modelName, 'deepseek-v4-flash'); assert.equal(calls, 1); assert.deepEqual(game, original);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
