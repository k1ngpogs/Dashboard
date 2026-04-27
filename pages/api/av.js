export default async function handler(req, res) {
  const { function: func, symbol, outputsize } = req.query;
  const apiKey = process.env.AV_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'AV_API_KEY not configured' });
  if (!symbol || !func) return res.status(400).json({ error: 'symbol and function required' });

  const validFunctions = [
    'OVERVIEW',
    'INCOME_STATEMENT',
    'BALANCE_SHEET',
    'CASH_FLOW',
    'EARNINGS',
    'GLOBAL_QUOTE',
  ];

  if (!validFunctions.includes(func)) {
    return res.status(400).json({ error: 'Invalid function' });
  }

  let url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${apiKey}`;
  if (outputsize) url += `&outputsize=${outputsize}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Alpha Vantage error: ${response.statusText}` });
    }
    const data = await response.json();

    // Alpha Vantage returns this when rate limited
    if (data['Note'] || data['Information']) {
      return res.status(429).json({ error: 'Alpha Vantage rate limit hit. Try again in a minute.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
