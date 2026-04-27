export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, type } = req.query;

  const redisUrl = process.env.KV_REST_API_URL || process.env.REDIS_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl) {
    // KV not configured — return empty gracefully
    if (!ticker) return res.status(200).json({ tickers: [] });
    return res.status(200).json({ qualitative: null, dca: null });
  }

  const baseUrl = redisUrl.startsWith('rediss://') || redisUrl.startsWith('redis://')
    ? `https://${redisUrl.replace(/rediss?:\/\/[^@]+@/, '')}`
    : redisUrl;

  const headers = { 'Content-Type': 'application/json' };
  if (redisToken) headers['Authorization'] = `Bearer ${redisToken}`;

  try {
    if (!ticker) {
      // Return ticker list
      const r = await fetch(`${baseUrl}/get/tickers`, { headers });
      const json = await r.json();
      const tickers = json.result ? JSON.parse(json.result) : [];
      return res.status(200).json({ tickers });
    }

    const symbol = ticker.toUpperCase();

    if (type) {
      const r = await fetch(`${baseUrl}/get/${encodeURIComponent(`analysis:${symbol}:${type}`)}`, { headers });
      const json = await r.json();
      if (!json.result) return res.status(200).json({ data: null });
      const parsed = JSON.parse(json.result);
      return res.status(200).json({ data: parsed.data, savedAt: parsed.savedAt });
    }

    // Return all saved types for this ticker
    const [qualRes, dcaRes] = await Promise.all([
      fetch(`${baseUrl}/get/${encodeURIComponent(`analysis:${symbol}:qualitative`)}`, { headers }),
      fetch(`${baseUrl}/get/${encodeURIComponent(`analysis:${symbol}:dca`)}`, { headers }),
    ]);

    const qualJson = await qualRes.json();
    const dcaJson = await dcaRes.json();

    return res.status(200).json({
      qualitative: qualJson.result ? JSON.parse(qualJson.result) : null,
      dca: dcaJson.result ? JSON.parse(dcaJson.result) : null,
    });
  } catch (err) {
    console.error('KV get error:', err);
    if (!ticker) return res.status(200).json({ tickers: [] });
    return res.status(200).json({ qualitative: null, dca: null });
  }
}
