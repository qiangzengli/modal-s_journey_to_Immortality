// 服务端专用：按配置顺序调用模型服务，返回实际提供回答的模型。
export function createModelClient(providers) {
  return async (messages, { temperature = 0, maxTokens = 600, validate = () => {} } = {}) => {
    let failure = new Error('model_unavailable');
    for (const provider of providers) {
      try {
        const endpoint = new URL('chat/completions', provider.baseURL.replace(/\/?$/, '/'));
        if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('invalid_model_url');
        const response = await fetch(endpoint, {
          method: 'POST', signal: AbortSignal.timeout(provider.timeoutMs ?? 30000),
          headers: { 'content-type': 'application/json', ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}) },
          body: JSON.stringify({ model: provider.model, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' }, ...(provider.model.startsWith('deepseek-v4') ? { thinking: { type: 'disabled' } } : {}), messages })
        });
        if (!response.ok) throw new Error(`model_http_${response.status}`);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) throw new SyntaxError('invalid_model_reply');
        validate(content.trim());
        return { content: content.trim(), modelName: provider.model };
      } catch (error) { failure = error; }
    }
    throw failure;
  };
}
