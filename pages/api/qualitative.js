export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, companyName } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const prompt = `You are a senior equity research analyst writing in April 2026. Analyse ${ticker}${companyName ? ` (${companyName})` : ''}.

Use web search to find current 2026 information. Search for: latest earnings (2025/2026), recent news, active legal cases and their current status, management changes, and key business developments in the last 12 months. Do not use stale information where current data exists.

After searching, return ONLY a JSON object — nothing before it, nothing after it. Start your response with { and end with }. No markdown, no code fences, no explanation.

{
  "business_model": "What the company does, how it makes money, revenue mix by segment and geography with specific percentages. 3-4 paragraphs.",
  "customers": "One paragraph only. Who pays, stickiness, concentration risk, switching costs.",
  "tam_and_growth": "TAM with specific figures. Growth runway, tailwinds or headwinds. 2 paragraphs.",
  "competitive_landscape": "Real competitors with market share. Fragmented or concentrated. How defensible. 2-3 paragraphs.",
  "moat": "Moat type with specific evidence not assertions. Widening or narrowing and why. What it would take to replicate. 2-3 paragraphs.",
  "management": "CEO background, track record, tenure. Key team. Communication quality. Specific shareholder letters or interviews worth reading. 2 paragraphs.",
  "capital_allocation_and_ownership": "What management has done with excess cash over 5-10 years. Buybacks, dividends, acquisitions. Buyback timing quality. CEO and executive ownership percentage. Compensation structure and alignment. 2 paragraphs.",
  "regulatory_legal": "One paragraph only. Active litigation, antitrust risk, regulatory overhang. Name specific cases and current status as of 2026. If minimal say so.",
  "key_risks_and_kpis": "3-5 things that could change the investment case positively or negatively. For each name the specific KPI and concrete threshold to monitor. 2-3 paragraphs."
}`;

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
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await response.json();

    // Extract all text blocks — the final one after web search will be the JSON
    const textBlocks = data.content.filter((b) => b.type === 'text');
    const fullText = textBlocks.map((b) => b.text).join('');

    // Find JSON object in the response
    const cleaned2 = fullText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleaned2.indexOf('{');
    const jsonEnd = cleaned2.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      return res.status(200).json({ raw: fullText, parseError: true });
    }

    const jsonString = cleaned2.slice(jsonStart, jsonEnd + 1);

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch {
      return res.status(200).json({ raw: fullText, parseError: true });
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
