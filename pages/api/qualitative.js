export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, companyName } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const prompt = `You are a senior equity research analyst. Conduct a thorough qualitative analysis of ${ticker}${companyName ? ` (${companyName})` : ''}. 

Use web search to find current, accurate information. Be specific with figures and facts — no vague generalities.

Return your analysis as a JSON object with exactly these keys. Each value should be a string containing 2-4 paragraphs of substantive analysis. Write in a direct, analytical tone — not promotional, not hedging. State what is true.

{
  "business_model": "What the company does, how it makes money, and its revenue mix by segment and geography. Be specific about percentages. This section should be comprehensive — 3-4 paragraphs.",
  "customers": "Who pays, how sticky they are, customer concentration risk, contract structures, switching costs from the customer's perspective.",
  "tam_and_growth": "Total addressable market size with specific figures. Growth runway — what's left to penetrate. Is this a mature or expanding market? Secular tailwinds or headwinds.",
  "competitive_landscape": "Who are the real competitors? Market share figures where available. Is the market fragmented or concentrated? Cyclical or structural growth? How defensible is the company's position?",
  "moat": "What type of moat exists (network effects, switching costs, brand, cost advantage, scarce asset). Provide specific EVIDENCE the moat exists — not just assertions. Is the moat widening or narrowing and why? What would it take for a competitor to replicate this position?",
  "management": "CEO background, track record, tenure. Key leadership team. Communication quality — are earnings calls candid or scripted? Are there shareholder letters or interviews worth reading/watching? Name specific ones if they exist.",
  "capital_allocation": "What has management done with excess cash over the last 5-10 years? Breakdown between buybacks, dividends, acquisitions, debt paydown, R&D. Did they buy back stock when it was cheap or expensive? Quality of acquisitions if applicable.",
  "insider_ownership": "CEO and executive ownership as % of shares and dollar value. Compensation structure — is it tied to ROIC/FCF or revenue/EBITDA? Are incentives aligned with long-term shareholders?",
  "regulatory_legal": "Any regulatory overhang or legal exposure? Antitrust risk? Pending litigation? Regulatory changes that could materially impact the business model? If minimal, say so clearly.",
  "key_risks_and_kpis": "What are the 3-5 things that could change your mind about this business — both negatively and positively? For each risk, name the specific KPI or metric to monitor. Be concrete: not 'competition could increase' but 'if Azure growth exceeds 35% for 3 consecutive quarters, it signals share loss.'"
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
        model: 'claude-sonnet-4-20250514',
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

    // Extract text from content blocks
    const textBlocks = data.content.filter((b) => b.type === 'text');
    const fullText = textBlocks.map((b) => b.text).join('');

    // Parse JSON from response
    const cleaned = fullText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return raw text
      return res.status(200).json({ raw: fullText, parseError: true });
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
