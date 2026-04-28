import { createClient } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, type } = req.query;

  try {
    const kv = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    if (!ticker) {
      const list = await kv.get('tickers');
      return res.status(200).json({ tickers: list ? JSON.parse(list) : [] });
    }

    const symbol = ticker.toUpperCase();

    if (type) {
      const raw = await kv.get(`analysis:${symbol}:${type}`);
      if (!raw) return res.status(200).json({ data: null });
      const parsed = JSON.parse(raw);
      return res.status(200).json({ data: parsed.data, savedAt: parsed.savedAt });
    }

    const [qualRaw, dcaRaw] = await Promise.all([
      kv.get(`analysis:${symbol}:qualitative`),
      kv.get(`analysis:${symbol}:dca`),
    ]);

    return res.status(200).json({
      qualitative: qualRaw ? JSON.parse(qualRaw) : null,
      dca: dcaRaw ? JSON.parse(dcaRaw) : null,
    });
  } catch (err) {
    return res.status(200).json({ tickers: [], qualitative: null, dca: null });
  }
}
