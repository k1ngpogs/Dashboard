export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticker, financialData } = req.body;
  if (!ticker || !financialData) return res.status(400).json({ error: 'Ticker and financial data required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const scorecardInstructions = `Run the full 22-criteria DCA scorecard using the Warren Buffett / Mary Buffett framework from "Interpreting Financial Statements."

Extract all financial data from the documents provided and return ONLY a JSON object — start with { end with }, no markdown, no code fences, nothing before or after.

{
  "company": "Company Name",
  "ticker": "${ticker}",
  "years": "extract the actual fiscal years from the documents provided, most recent first",
  "raw_financials": {
    "revenue": [num, num, num, num, num],
    "gross_profit": [num, num, num, num, num],
    "operating_income": [num, num, num, num, num],
    "net_income": [num, num, num, num, num],
    "dna": [num, num, num, num, num],
    "operating_cf": [num, num, num, num, num],
    "capex": [num, num, num, num, num],
    "lt_debt": [num, num, num, num, num],
    "st_debt": [num, num, num, num, num],
    "cash": [num, num, num, num, num],
    "eps": [num, num, num, num, num],
    "retained_earnings": [num, num, num, num, num],
    "total_assets": [num, num, num, num, num],
    "total_equity": [num, num, num, num, num],
    "interest_expense": [num, num, num, num, num]
  },
  "criteria": [
    {
      "number": 1,
      "name": "Gross margin %",
      "category": "INCOME STATEMENT QUALITY",
      "values": {"2024": "82.0%", "2023": "80.8%"},
      "threshold": "pass ≥60%, warn ≥40%, fail <40%",
      "result": "pass",
      "explanation": "2-3 sentences specific to this business."
    }
  ],
  "summary": {
    "pass_count": 13,
    "warn_count": 4,
    "fail_count": 5,
    "verdict": "Moderate-Strong DCA signals",
    "strongest_signal": "Description",
    "biggest_risk": "Description"
  }
}

The 22 criteria:
1. Gross margin % — pass ≥60%, warn ≥40%, fail <40% [INCOME STATEMENT QUALITY]
2. SG&A as % of gross profit — pass ≤30%, warn ≤60%, fail >60% [INCOME STATEMENT QUALITY]
3. R&D as % of gross profit — pass ≤10%, warn ≤30%, fail >30% [INCOME STATEMENT QUALITY]
4. Interest expense as % of operating income — pass ≤15%, warn ≤30%, fail >30% [INCOME STATEMENT QUALITY]
5. Net margin % (+ trend) — pass ≥20%, warn ≥10%, fail <10% [INCOME STATEMENT QUALITY]
6. EPS trend — pass = consistently growing, warn = mixed, fail = declining [INCOME STATEMENT QUALITY]
7. Depreciation as % of gross profit — pass ≤15%, warn ≤25%, fail >25% [ASSET EFFICIENCY]
8. Cash & equivalents trend — pass = growing/large, warn = mixed, fail = shrinking [ASSET EFFICIENCY]
9. Short-term debt vs long-term debt — pass = LTD dominates or no debt, fail = ST dominates [ASSET EFFICIENCY]
10. LTD payoff years (LTD / avg net income) — pass ≤3yrs, warn ≤5yrs, fail >5yrs [ASSET EFFICIENCY]
11. Treasury-adjusted debt/equity — pass ≤0.80x, warn ≤1.5x, fail >1.5x [ASSET EFFICIENCY]
12. Preferred stock — pass = none, fail = present [ASSET EFFICIENCY]
13. Retained earnings trend — pass = consistently growing, warn = mixed, fail = declining [SHAREHOLDER VALUE CREATION]
14. Share buybacks — pass = consistent, warn = occasional, fail = none or issuing [SHAREHOLDER VALUE CREATION]
15. ROA % — pass ≥12%, warn ≥7%, fail <7% [RETURN METRICS]
16. Treasury-adjusted ROE % — pass ≥20%, warn ≥12%, fail <12% [RETURN METRICS]
17. Leverage assessment (LTD/Assets) — pass = low, warn = moderate, fail = high [RETURN METRICS]
18. CapEx as % of net earnings — pass ≤25%, warn ≤50%, fail >50% [CASH GENERATION QUALITY]
19. Operating CF consistency — pass = always positive, warn = mostly, fail = negative years [CASH GENERATION QUALITY]
20. ROIC % (NOPAT / invested capital) — pass ≥20%, warn ≥15%, fail <15% [CASH GENERATION QUALITY]
21. FCF margin % ((OpCF - CapEx) / Revenue) — pass ≥25%, warn ≥15%, fail <15% [CASH GENERATION QUALITY]
22. Owner's earnings trend (NI + D&A - 50% CapEx) — pass = growing, warn = mixed, fail = declining [CASH GENERATION QUALITY]`;

  // Build message content
  let messageContent = [];

  if (financialData.type === 'pdf') {
    const fileList = financialData.files || (financialData.data ? [{ base64: financialData.data, name: 'document.pdf' }] : []);
    fileList.forEach((file, i) => {
      messageContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
      });
    });
    messageContent.push({
      type: 'text',
      text: `The ${fileList.length} PDF(s) above contain financial statements for ${ticker}. Extract all financial data across all documents and then:\n\n${scorecardInstructions}`,
    });
  } else {
    messageContent = `Financial statement data for ${ticker}:\n\n${financialData.data}\n\n${scorecardInstructions}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await response.json();
    const textBlocks = data.content.filter((b) => b.type === 'text');
    const fullText = textBlocks.map((b) => b.text).join('');

    const jsonStart = fullText.indexOf('{');
    const jsonEnd = fullText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return res.status(200).json({ raw: fullText, parseError: true });
    }

    let scorecard;
    try {
      scorecard = JSON.parse(fullText.slice(jsonStart, jsonEnd + 1));
    } catch {
      return res.status(200).json({ raw: fullText, parseError: true });
    }

    return res.status(200).json({ scorecard });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
