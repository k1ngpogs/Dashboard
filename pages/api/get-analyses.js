import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, type } = req.query;

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    if (!ticker) {
      const list = await redis.get('tickers');
      return res.status(200).json({ tickers: list ? JSON.parse(list) : [] });
    }

    const symbol = ticker.toUpperCase();

    if (type) {
      const raw = await redis.get(`analysis:${symbol}:${type}`);
      if (!raw) return res.status(200).json({ data: null });
      const parsed = JSON.parse(raw);
      return res.status(200).json({ data: parsed.data, savedAt: parsed.savedAt });
    }

    const [qualRaw, dcaRaw] = await Promise.all([
      redis.get(`analysis:${symbol}:qualitative`),
      redis.get(`analysis:${symbol}:dca`),
    ]);

    return res.status(200).json({
      qualitative: qualRaw ? JSON.parse(qualRaw) : null,
      dca: dcaRaw ? JSON.parse(dcaRaw) : null,
    });
  } catch (err) {
    console.error('KV get error:', err);
    return res.status(200).json({ tickers: [], qualitative: null, dca: null });
  }
}
