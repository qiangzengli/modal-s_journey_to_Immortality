import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createModelClient } from './model-client.js';
import { createAgentModel, createStoryAgent } from './story-agent.js';
import { createGame, getView } from './engine.js';

test('本机成功不调用云端；连接错误、超时、非法回答依次回退，恢复后仍优先本机', async () => {
  let mode = 'ok', localCalls = 0, cloudCalls = 0;
  const serve = async handler => {
    const server = createServer(handler); server.listen(0, '127.0.0.1'); await once(server, 'listening'); return server;
  };
  const send = (res, content) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content } }] })); };
  const local = await serve((req, res) => {
    localCalls++;
    if (mode === 'timeout') return;
    if (mode === 'http') { res.writeHead(503); res.end(); return; }
    if (mode === 'connection') { req.socket.destroy(); return; }
    send(res, mode === 'invalid' ? '{"ok":false}' : mode === 'json' ? 'not-json' : '{"ok":true}');
  });
  const cloud = await serve(async (req, res) => {
    cloudCalls++;
    assert.equal(req.headers.authorization, 'Bearer test-cloud-key');
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(payload.model, 'deepseek-v4-flash');
    assert.deepEqual(payload.thinking, { type: 'disabled' });
    if (mode === 'both-fail') { res.writeHead(503); res.end(); return; }
    send(res, '{"ok":true}');
  });
  const primary = { baseURL: `http://127.0.0.1:${local.address().port}/v1`, model: 'local', timeoutMs: 100 };
  const fallback = { baseURL: `http://127.0.0.1:${cloud.address().port}`, model: 'deepseek-v4-flash', apiKey: 'test-cloud-key', timeoutMs: 1000 };
  const complete = createModelClient([primary, fallback]);
  const input = [{ role: 'user', content: '只输出 JSON' }];
  const options = { validate: content => { if (!JSON.parse(content).ok) throw new Error('invalid_reply'); } };
  try {
    assert.equal((await complete(input, options)).modelName, 'local'); assert.equal(cloudCalls, 0);
    for (mode of ['http', 'connection', 'timeout', 'json', 'invalid']) assert.equal((await complete(input, options)).modelName, 'deepseek-v4-flash');
    assert.equal(cloudCalls, 5); assert.equal(localCalls, 6);
    mode = 'ok'; assert.equal((await complete(input, options)).modelName, 'local'); assert.equal(cloudCalls, 5);
    mode = 'both-fail';
    await assert.rejects(complete(input, { validate: () => { throw new Error('invalid_reply'); } }), /model_http_503/);
  } finally {
    for (const server of [local, cloud]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
});

test('人物与手札验证本机内容后回退，响应标明实际云端模型且不改变状态', async () => {
  let calls = 0;
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body); calls++;
    const content = JSON.stringify({ title: '先验丹', text: '你可以先请白芷核验丹药。', followUps: [], suggestionIds: payload.model === 'local' ? ['grant_stones'] : ['bai'] });
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const game = createGame(), original = structuredClone(game);
  try {
    const agent = createStoryAgent({ modelName: 'local', generate: createAgentModel({ baseURL, model: 'local', fallback: { baseURL, model: 'deepseek-v4-flash' } }) });
    const reply = await agent.respond(getView(game), { mode: 'guide', text: '怎么办？' });
    assert.equal(reply.source, 'model'); assert.equal(reply.modelName, 'deepseek-v4-flash'); assert.equal(calls, 2);
    assert.equal(reply.suggestions[0].target, 'bai'); assert.deepEqual(game, original);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
