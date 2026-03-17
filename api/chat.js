export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' });

  const trimmedKey = apiKey.trim();

  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + trimmedKey
      },
      body: JSON.stringify({
        model: 'ep-20260318042159-44mqt',
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          ...messages
        ]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const text = data.choices?.[0]?.message?.content || '没有拿到回复。';
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
