// 与真实 Codex 网关一致的 Responses 流式回复，供接口测试使用。
export function modelResponse(content) {
  return { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: content }] }] };
}

export function sendModelReply(res, content) {
  res.setHeader('content-type', 'text/event-stream');
  res.end(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: content })}\n\n`
    + `data: ${JSON.stringify({ type: 'response.completed', response: modelResponse(content) })}\n\n`);
}

export function combatPlan(intent='attack',speech='对方凝气试探。') {
  return Object.fromEntries(['normal','wounded','opportunity','exhausted'].map(key=>[key,{intent,speech}]));
}
