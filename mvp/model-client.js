// 服务端专用：只调用指定服务，失败时交由调用方显示规则线索或错误。
export function createModelClient(provider) {
  return async (messages, { temperature = 0, maxTokens = 600, validate = () => {} } = {}) => {
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
  };
}
