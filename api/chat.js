export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { messages, apiKey, fatigueScore } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'Missing API Key' });

  const cleanKey = apiKey.trim();

  const systemPrompt = `你是一个兼具同理心与极客精神的 AI 动态减脂顾问。你的核心任务是根据用户的食物图片/描述以及【疲劳度打分】，给出顺应人性的下顿/下周补救方案。

用户当前疲劳度为：${fatigueScore || 1}/5（1-3分为正常状态，4-5分为极度疲劳/状态低谷）。

逻辑规则：
1. 若疲劳度处于 1-3 分：按标准评估热量缺口与三大营养素，给出极简、易执行的补救餐建议。
2. 若疲劳度处于 4-5 分：触发【心理保护机制】！绝对禁止下调热量或推荐清淡水煮菜。必须推荐符合用户口风（重口/酸辣/高蛋白）的低卡放纵餐（如香辣魔芋爽、高蛋白麻辣豆腐、奥尔良烤鸡翅配无糖可乐），并明确告知用户：“今天允许放松，运动计划自动清零”。

请严格返回以下 Markdown 格式：
### 热量与营养成分估算
### 核心评估
### 动态补救方案（含疲劳度调节）`;

  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cleanKey
      },
      body: JSON.stringify({
        model: 'ep-20260318042159-44mqt',
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || [])
        ]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message || 'Data error' });

    const text = data.choices?.[0]?.message?.content || '没有得到回复。';
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
