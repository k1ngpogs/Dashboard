import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, type, data } = req.body;
  if (!ticker || !type || !data) {
    return res.status(400).json({ error: 'ticker, type, and data are required' });
  }

  try {
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const symbol = ticker.toUpperCase();
    await kv.set(`analysis:${symbol}:${type}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));

    const existing = await kv.get('tickers');
    const list = existing ? JSON.parse(existing) : [];
    if (!list.includes(symbol)) {
      list.unshift(symbol);
      await kv.set('tickers', JSON.stringify(list));
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
