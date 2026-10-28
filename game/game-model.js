export const GAME_MODEL = 'deepseek-v4-flash';

export function gameModelConfig(env = process.env) {
  if (!env.LLM_API_KEY) return null;
  return {
    // 测试使用独立假服务；正常游戏固定走 DeepSeek，不读取旧的本机/备用配置。
    baseURL: env.NODE_ENV === 'test' && env.TEST_LLM_BASE_URL || 'https://api.deepseek.com',
    model: GAME_MODEL,
    apiKey: env.LLM_API_KEY,
    timeoutMs: Number(env.LLM_TIMEOUT_MS || 30000)
  };
}
