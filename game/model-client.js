// 服务端专用：只调用指定服务，失败时交由调用方显示规则线索或错误。
function responseText(data) {
  if (data.status !== 'completed') throw new Error('model_response_incomplete');
  return (data.output ?? []).filter(item => item.type === 'message')
    .flatMap(item => item.content ?? []).filter(part => part.type === 'output_text')
    .map(part => part.text).join('');
}

async function readResponse(response) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    return responseText(await response.json());
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', dataLines = [];
  function event() {
    if (!dataLines.length) return;
    const data = JSON.parse(dataLines.join('\n'));
    dataLines = [];
    if (data.type === 'error' || data.type === 'response.failed' || data.type === 'response.incomplete') {
      throw new Error('model_response_failed');
    }
    // 只接受完整回复，断流前的增量文本不能成为可执行的游戏行动。
    if (data.type === 'response.completed') return responseText(data.response);
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (done) buffer += '\n\n';
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
        else if (!line) {
          const content = event();
          if (content !== undefined) return content;
        }
      }
      if (done) throw new SyntaxError('invalid_model_reply');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function createModelClient(provider) {
  return async (messages, { temperature = 0, maxTokens = 600, validate = () => {}, signal } = {}) => {
    const endpoint = new URL('responses', provider.baseURL.replace(/\/?$/, '/'));
    if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('invalid_model_url');
    const response = await fetch(endpoint, {
      method: 'POST', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(provider.timeoutMs ?? 30000)]) : AbortSignal.timeout(provider.timeoutMs ?? 30000),
      headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}) },
      body: JSON.stringify({
        model: provider.model, temperature, max_output_tokens: maxTokens,
        store: false, stream: true, text: { format: { type: 'json_object' } },
        instructions: messages.filter(message => message.role === 'system').map(message => message.content).join('\n'),
        input: [
          // 网关的 JSON 模式只检查 user 消息，instructions 中的 JSON 提示不计入。
          { role: 'user', content: [{ type: 'input_text', text: '只输出 JSON 对象。' }] },
          ...messages.filter(message => message.role !== 'system').map(message => ({
            role: message.role,
            content: [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text: message.content }]
          }))
        ]
      })
    });
    if (!response.ok) throw new Error(`model_http_${response.status}`);
    const content = await readResponse(response);
    if (typeof content !== 'string' || !content.trim()) throw new SyntaxError('invalid_model_reply');
    validate(content.trim());
    return { content: content.trim(), modelName: provider.model };
  };
}
