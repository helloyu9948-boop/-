export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { apiKey, fatigueScore, planMode, imageBase64, messages } = body;

    const userApiKey = apiKey || process.env.DOUBAO_API_KEY;

    if (!userApiKey) {
      return res.status(200).json({ error: '未找到 API Key，请检查配置或输入框。' });
    }

    const systemPrompt = `你是一个专业的动态减脂与心理保护助手。
用户当前减脂模式: ${planMode || 'comfortable'} (strict/comfortable/relax)
用户当前疲劳度: ${fatigueScore || 1}/5

请根据用户的饮食描述或识别图片中的餐食内容，按如下逻辑回答：
1. 估算所含热量及三大营养素比例。
2. 结合用户的【减脂模式】和【疲劳度】给出调整建议。如果疲劳度>=4或处于relax模式，必须优先提供心理抚慰与高容错策略，禁止过度苛责。
3. 输出格式清晰干净，语言简洁专业，语气松弛专注。`;

    let formattedMessages = [
      { role: 'system', content: systemPrompt }
    ];

    if (messages && messages.length > 0) {
      const userMsg = messages[messages.length - 1];
      const textContent = userMsg.content || '';

      if (imageBase64) {
        formattedMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: textContent },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        });
      } else {
        formattedMessages.push({
          role: 'user',
          content: textContent
        });
      }
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userApiKey}`
      },
      body: JSON.stringify({
        model: 'ep-20260318042159-44mqt',
        messages: formattedMessages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(200).json({ 
        error: `火山方舟 API 返回错误 (${response.status})。若带图报错，请确认火山后台【ep-20260318042159-44mqt】接入点是否为多模态/视觉识别模型 (Doubao Vision)。错误详情：${errorText}` 
      });
    }

    const data = await response.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '模型未返回有效文本';

    return res.status(200).json({ text: reply });
  } catch (err) {
    return res.status(200).json({ error: '后端运行异常: ' + err.message });
  }
}
