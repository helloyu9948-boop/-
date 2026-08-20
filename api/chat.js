export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, apiKey, fatigueScore, planMode, imageBase64 } = req.body;
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
            initSurveyState();
            setupPasteListener();
        });

        // 1. PC 粘贴 (Ctrl+V) 监听
        function setupPasteListener() {
            const textarea = document.getElementById('userInput');
            textarea.addEventListener('paste', (e) => {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let item of items) {
                    if (item.type.indexOf('image') === 0) {
                        e.preventDefault();
                        const blob = item.getAsFile();
                        processImageFile(blob);
                        break;
                    }
                }
            });
        }

        // 2. 手机拍照与选择图片
        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (file) processImageFile(file);
        }

        function processImageFile(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentBase64Image = e.target.result;
                document.getElementById('imagePreview').src = currentBase64Image;
                document.getElementById('imageName').innerText = file.name || '已捕获图片';
                document.getElementById('imagePreviewContainer').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }

        function removeImage() {
            currentBase64Image = '';
            document.getElementById('imagePreviewContainer').classList.add('hidden');
        }

        // 3. 问卷与 7 天复盘机制
        function initSurveyState() {
            const profileRaw = localStorage.getItem('user_plan_profile');
            if (!profileRaw) {
                openSurveyModal();
            } else {
                const profile = JSON.parse(profileRaw);
                const now = Date.now();
                const daysPassed = Math.floor((now - (profile.updatedAt || now)) / (1000 * 60 * 60 * 24));
                
                updateProfileUI(profile, daysPassed);
                if (daysPassed >= 7) {
                    setTimeout(() => {
                        alert('已坚持 7 天！建议重新提交感受问卷，AI 将为你重新对齐下周食谱。');
                        openSurveyModal();
                    }, 500);
                }
            }
        }

        function openSurveyModal() {
            document.getElementById('surveyModal').classList.remove('hidden');
        }

        function saveSurvey() {
            const fatigue = parseInt(document.getElementById('surveyFatigue').value);
            let mode = document.getElementById('surveyMode').value;
            const feeling = document.getElementById('surveyFeeling').value;

            if (feeling === 'too_hard') {
                mode = 'relax';
            }

            const profile = {
                fatigue: fatigue,
                mode: mode,
                feeling: feeling,
                updatedAt: Date.now()
            };

            localStorage.setItem('user_plan_profile', JSON.stringify(profile));
            document.getElementById('surveyModal').classList.add('hidden');
            updateProfileUI(profile, 0);
        }

        function updateProfileUI(profile, daysPassed) {
            const modeNames = {
                'strict': '严格高效 ⚡',
                'comfortable': '舒适可持续 🥗',
                'relax': '心理保护/放纵 🛡️'
            };
            document.getElementById('planLabel').innerText = modeNames[profile.mode] || profile.mode;
            document.getElementById('fatigueLabel').innerText = profile.fatigue + '/5';
            document.getElementById('nextSurveyTip').innerText = `已坚持 ${daysPassed} 天 (7天周期复盘)`;
        }

        // 4. 发送给后台 API
        async function analyze() {
            const input = document.getElementById('userInput').value;
            const resBox = document.getElementById('result');
            const apiKey = localStorage.getItem('doubao_key') || '';
            const profile = JSON.parse(localStorage.getItem('user_plan_profile') || '{"fatigue":1,"mode":"comfortable"}');

            if (!input && !currentBase64Image) {
                return alert('请先描述饮食或上传/粘贴截图/拍照');
            }

            resBox.innerText = 'AI 正在根据你的问卷状态算缺口与饮食方案...';

            try {
                const res = await fetch('/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey: apiKey,
                        fatigueScore: profile.fatigue,
                        planMode: profile.mode,
                        imageBase64: currentBase64Image,
                        messages: [{ 
                            role: 'user', 
                            content: `[用户当前减脂模式: ${profile.mode}, 疲劳度: ${profile.fatigue}/5]\n描述: ${input}` 
                        }]
                    })
                });
                const data = await res.json();
                resBox.innerText = data.text || data.error || '解析失败';
            } catch (e) {
                resBox.innerText = '请求失败：' + e.message;
            }
        }
    </script>
</body>
</html>
