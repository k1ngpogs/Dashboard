export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, type, data } = req.body;
  if (!ticker || !type || !data) {
    return res.status(400).json({ error: 'ticker, type, and data required' });
  }

  const redisUrl = process.env.KV_REST_API_URL || process.env.REDIS_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl) {
    return res.status(500).json({ error: 'KV not configured' });
  }

  const symbol = ticker.toUpperCase();
  const key = `analysis:${symbol}:${type}`;
  const value = JSON.stringify({ data, savedAt: new Date().toISOString() });

  try {
    // Use Upstash REST API directly
    const baseUrl = redisUrl.startsWith('rediss://') || redisUrl.startsWith('redis://')
      ? `https://${redisUrl.replace(/rediss?:\/\/[^@]+@/, '')}`
      : redisUrl;

    const headers = { 'Content-Type': 'application/json' };
    if (redisToken) headers['Authorization'] = `Bearer ${redisToken}`;

    // SET the analysis
    const setRes = await fetch(`${baseUrl}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify([value]),
    });

    if (!setRes.ok) throw new Error(`Redis SET failed: ${await setRes.text()}`);

    // Update ticker list
    const listKey = 'tickers';
    const getRes = await fetch(`${baseUrl}/get/${listKey}`, { headers });
    const getJson = await getRes.json();
    const existing = getJson.result ? JSON.parse(getJson.result) : [];
    if (!existing.includes(symbol)) {
      existing.unshift(symbol);
      await fetch(`${baseUrl}/set/${listKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify([JSON.stringify(existing)]),
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('KV save error:', err);
    return res.status(500).json({ error: err.message });
  }
}
