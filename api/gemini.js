import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.5-flash';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { messages, systemInstruction } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const contents = messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || '' }],
    }));

    const response = await ai.models.generateContent({
      model: MODEL,
      config: {
        systemInstruction: systemInstruction || '',
        temperature: 0.7,
      },
      contents,
    });

    const text = (response?.text ?? '').trim();
    return res.status(200).json({ text });
  } catch (err) {
    console.error('Gemini API error:', err);
    return res.status(500).json({
      error: err?.message || 'Error calling Gemini',
    });
  }
}
