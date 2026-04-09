require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Model catalogue ──────────────────────────────────────────────────────────
// Grouped by family. Used by the /api/models endpoint so the client never
// needs to hard-code them.
const MODEL_FAMILIES = {
  'GPT-4o': {
    description: 'Flagship multimodal — best quality',
    models: ['gpt-4o', 'gpt-4o-mini'],
  },
  'GPT-4 Turbo': {
    description: 'High capability, fast throughput',
    models: ['gpt-4-turbo'],
  },
  'GPT-4': {
    description: 'Highly capable baseline',
    models: ['gpt-4'],
  },
  'GPT-3.5': {
    description: 'Fast and cost-efficient',
    models: ['gpt-3.5-turbo'],
  },
  'o1 (Reasoning)': {
    description: 'Advanced multi-step reasoning',
    models: ['o1', 'o1-mini'],
  },
};

// ── /api/models ──────────────────────────────────────────────────────────────
app.get('/api/models', (_req, res) => {
  res.json(MODEL_FAMILIES);
});

// ── /api/generate ────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not set. Add it to your .env file and restart the server.',
    });
  }

  const { model, product, description, sentiments } = req.body;

  if (!model || !product) {
    return res.status(400).json({ error: 'model and product fields are required.' });
  }

  // ── Build the prompt ───────────────────────────────────────────────────────
  const SENTIMENT_LABELS = {
    1: 'very dissatisfied — serious problems here',
    2: 'dissatisfied — noticeably below expectations',
    3: 'neutral — neither impressed nor disappointed',
    4: 'satisfied — genuinely pleased',
    5: 'very satisfied — exceeded expectations',
  };

  const sentimentLines = Object.entries(sentiments || {})
    .map(([aspect, value]) => `  • ${aspect}: ${SENTIMENT_LABELS[value] || 'neutral'}`)
    .join('\n');

  const systemPrompt =
    'You are a realistic, opinionated product reviewer. ' +
    'Write authentic reviews that sound like a real person sharing their experience — ' +
    'not marketing copy. Use markdown formatting: a short bold title, then sections with ## headers ' +
    'for each aspect, with bullet points for specific observations. Finish with a ## Verdict section.';

  const userPrompt =
    `Write a product review for: **${product}**` +
    (description ? `\n\nProduct description: ${description}` : '') +
    `\n\nSentiment per aspect (let these drive the tone naturally — do not just list them):\n${sentimentLines}` +
    `\n\nAim for 250–400 words. Be specific and conversational.`;

  // ── o1 models have different API requirements ──────────────────────────────
  const isO1 = model.startsWith('o1');

  const messages = isO1
    ? [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
    : [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ];

  const requestBody = {
    model,
    messages,
    stream: true,
    ...(isO1
      ? { max_completion_tokens: 1024 }
      : { temperature: 0.85, max_tokens: 1024 }),
  };

  // ── Stream response back to client via SSE ─────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'Network error reaching OpenAI: ' + err.message })}\n\n`);
    return res.end();
  }

  if (!upstream.ok) {
    let errMsg = `OpenAI returned ${upstream.status}`;
    try {
      const body = await upstream.json();
      errMsg = body?.error?.message || errMsg;
    } catch {}

    const friendly =
      upstream.status === 401 ? 'Invalid API key. Check your .env file.' :
      upstream.status === 429 ? 'Rate limit reached. Wait a moment and try again.' :
      upstream.status >= 500  ? 'OpenAI server error. Try again shortly.' : errMsg;

    res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
    return res.end();
  }

  // Pipe the SSE stream
  const decoder = new (require('util').TextDecoder)();
  upstream.body.on('data', (chunk) => {
    const text  = decoder.decode(chunk, { stream: true });
    const lines = text.split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') {
        res.write('data: [DONE]\n\n');
        return;
      }
      try {
        const parsed  = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      } catch {}
    }
  });

  upstream.body.on('end',   () => res.end());
  upstream.body.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ error: 'Stream error: ' + err.message })}\n\n`);
    res.end();
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Product Review Generator`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  API key loaded: ${process.env.OPENAI_API_KEY ? '✓' : '✗  (add OPENAI_API_KEY to .env)'}\n`);
});
