export default async function handler(req, res) {
  const { endpoint, symbol, limit } = req.query;
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'FMP_API_KEY not configured' });
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const validEndpoints = [
    'profile',
    'ratios',
    'ratios-ttm',
    'key-metrics',
    'key-metrics-ttm',
    'enterprise-values',
    'stock_peers',
    'income-statement',
    'balance-sheet-statement',
    'cash-flow-statement',
    'quote',
  ];

  const ep = endpoint || 'profile';
  if (!validEndpoints.includes(ep)) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  // Some endpoints use different URL structures
  let url;
  if (ep === 'stock_peers') {
    url = `https://financialmodelingprep.com/api/v4/stock_peers?symbol=${symbol}&apikey=${apiKey}`;
  } else {
    const lim = limit || 10;
    url = `https://financialmodelingprep.com/api/v3/${ep}/${symbol}?limit=${lim}&apikey=${apiKey}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `FMP API error: ${response.statusText}` });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
