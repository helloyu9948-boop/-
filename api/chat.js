export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, apiKey, fatigueScore, planMode, imageBase64 } = req.body || {};
  const trimmedKey = (apiKey || '').trim();

  const systemPrompt = `你是一个兼具同理心与极客精神的 AI 动态减脂顾问。你的核心任务是根据用户的食物图片/描述以及【疲劳度打分与模式】，给出顺应人性的下顿/下周补救方案。

当前状态：
- 疲劳度：${fatigueScore || 1}/5
- 模式：${planMode || 'comfortable'}

逻辑规则：
1. 疲劳度 1-3分 / 严格或舒适模式：评估热量缺口与三大营养素，给出易执行的补救方案。
2. 疲劳度 4-5分 / 心理保护模式：绝对禁止下调热量或推荐纯水煮菜，必须推荐符合重口/酸辣/高蛋白的低卡放纵餐（如香辣魔芋爽、高蛋白麻辣豆腐、奥尔良烤鸡翅配无糖可乐），运动清零。

请严格返回 Markdown 格式：
### 热量与营养成分估算
### 核心评估
### 动态补救方案`;

  try {
    const apiMessages = [{ role: 'system', content: systemPrompt }];
    if (imageBase64) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: messages?.[0]?.content || '分析图片中的食物' },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      });
    } else if (messages && messages.length > 0) {
      apiMessages.push(...messages);
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (trimmedKey || process.env.DOUBAO_API_KEY)
      },
      body: JSON.stringify({
        model: 'ep-20260318042159-44mqt',
        max_tokens: 600,
        messages: apiMessages
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message || 'Data error' });

    const text = data.choices?.[0]?.message?.content || '没有拿到回复。';
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
