export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, companyName } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const prompt = `You are a senior equity research analyst writing in April 2026. Conduct a thorough qualitative analysis of ${ticker}${companyName ? ` (${companyName})` : ''}.

Use web search extensively to find the most current information available as of 2026. This is critical — search for 2025 and 2026 earnings, recent strategic developments, current legal cases, leadership changes, and any business changes in the last 12 months. Do not rely on information older than 12 months where more recent data exists. Be specific with figures and facts.

Return your analysis as a JSON object with exactly these keys. Write in a direct, analytical tone — not promotional, not hedging. State what is true.

{
  "business_model": "What the company does, how it makes money, and its revenue mix by segment and geography. Specific percentages. Comprehensive — 3-4 paragraphs.",
  "customers": "One paragraph. Who pays, how sticky, concentration risk, switching costs.",
  "tam_and_growth": "TAM size with specific figures. Growth runway, secular tailwinds or headwinds. 2 paragraphs.",
  "competitive_landscape": "Real competitors with market share figures. Fragmented or concentrated market. How defensible is the position. 2-3 paragraphs.",
  "moat": "Moat type with specific EVIDENCE it exists — not assertions. Is it widening or narrowing and why. What would it take to replicate. 2-3 paragraphs.",
  "management": "CEO background, track record, tenure. Key leadership team. Communication quality — candid or scripted. Specific shareholder letters, interviews, or earnings calls worth reading. 2 paragraphs.",
  "capital_allocation_and_ownership": "Combined section. What management has done with excess cash over 5-10 years — buybacks, dividends, acquisitions, debt. Buyback timing quality. CEO and executive ownership as % of shares. Compensation structure and whether incentives align with shareholders. 2 paragraphs.",
  "regulatory_legal": "One paragraph. Current regulatory overhang, active litigation, antitrust risk, pending cases. Name specific cases and their status. If minimal, say so clearly.",
  "key_risks_and_kpis": "3-5 things that could change your mind positively or negatively. For each, name the specific KPI or metric to monitor. Be concrete with thresholds, not vague. 2-3 paragraphs."
}

IMPORTANT: Return ONLY the JSON object. No markdown, no code fences, no preamble. Just the raw JSON.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await response.json();
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
