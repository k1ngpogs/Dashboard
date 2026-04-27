export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, companyName } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const prompt = `You are a senior equity research analyst writing in April 2026. Conduct a thorough qualitative analysis of ${ticker}${companyName ? ` (${companyName})` : ''}.

Search the web for the most current information as of 2026. You must find: 2025 and 2026 earnings results, recent strategic developments, current legal cases and their status, leadership changes, and any major business changes in the last 12 months. Do not use information older than 12 months where newer exists. Be specific with figures and facts.

Return your analysis as a JSON object with exactly these keys. Direct analytical tone — no hedging, no promotion. State what is true.

{
  "business_model": "What the company does, how it makes money, revenue mix by segment and geography with specific percentages. 3-4 paragraphs.",
  "customers": "One paragraph only. Who pays, stickiness, concentration risk, switching costs.",
  "tam_and_growth": "TAM with specific figures. Growth runway, tailwinds or headwinds. 2 paragraphs.",
  "competitive_landscape": "Real competitors with market share. Fragmented or concentrated. How defensible. 2-3 paragraphs.",
  "moat": "Moat type with specific evidence — not assertions. Widening or narrowing and why. What it would take to replicate. 2-3 paragraphs.",
  "management": "CEO background, track record, tenure. Key team. Communication quality. Specific shareholder letters or interviews worth reading. 2 paragraphs.",
  "capital_allocation_and_ownership": "What management has done with excess cash over 5-10 years. Buybacks, dividends, acquisitions. Buyback timing quality. CEO and executive ownership percentage. Compensation structure and alignment. 2 paragraphs.",
  "regulatory_legal": "One paragraph only. Active litigation, antitrust risk, regulatory overhang. Name specific cases and current status. If minimal say so.",
  "key_risks_and_kpis": "3-5 things that could change the investment case positively or negatively. For each name the specific KPI and concrete threshold to monitor. 2-3 paragraphs."
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation before or after. Start with { and end with }.`;

  try {
    // First call with web search to gather current information
    const searchResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ 
          role: 'user', 
          content: `Search the web for current information about ${ticker} as of April 2026. Find: latest earnings (2025/2026), recent news, current legal cases, business model details, competitors, management updates. Summarize what you find.`
        }],
      }),
    });

    let searchContext = '';
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const textBlocks = searchData.content.filter((b) => b.type === 'text');
      searchContext = textBlocks.map((b) => b.text).join('');
    }

    // Second call to produce structured JSON using search results
    const analysisResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 6000,
        messages: [{ 
          role: 'user', 
          content: searchContext 
            ? `Here is current research about ${ticker} as of April 2026:\n\n${searchContext}\n\nUsing this information, ${prompt}`
            : prompt
        }],
      }),
    });

    if (!analysisResponse.ok) {
      const errText = await analysisResponse.text();
      return res.status(analysisResponse.status).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await analysisResponse.json();
    const textBlocks = data.content.filter((b) => b.type === 'text');
    const fullText = textBlocks.map((b) => b.text).join('');
    const cleaned = fullText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ raw: fullText, parseError: true });
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
