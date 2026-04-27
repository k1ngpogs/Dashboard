# Investment Analysis Dashboard

A shared investment analysis tool built on the Buffett framework. Qualitative analysis, 22-criteria DCA scorecard, DCF calculator, and relative valuation — all in one place.

## What It Does

- **Qualitative Analysis**: Enter a ticker → AI researches the company using live web data and generates a 10-section analysis (business model, moat, management, risks, etc.)
- **DCA Scorecard**: Paste 5 years of financial statements → AI runs 22-criteria Buffett/Mary Buffett analysis with pass/warn/fail scoring
- **DCF Calculator**: Interactive bear/base/bull scenario DCF using owner's earnings
- **Relative Valuation**: Auto-fetches P/E, EV/EBITDA, P/FCF, P/S, P/B, FCF yield + 5yr/10yr averages + peer comparison

---

## Deployment Guide (30 minutes)

### Step 1: Get Your API Keys

**Anthropic API Key** (powers qualitative + DCA analysis):
1. Go to https://console.anthropic.com
2. Create an account, add $5 credit (pay-as-you-go, no subscription)
3. Go to Settings → API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)

**Financial Modeling Prep API Key** (powers relative valuation data):
1. Go to https://site.financialmodelingprep.com/developer/docs
2. Sign up for a free account
3. Your API key will be on the dashboard after signup
4. Free tier = 250 requests/day (plenty for personal use)

### Step 2: Push Code to GitHub

1. Create a GitHub account if you don't have one: https://github.com
2. Click "New Repository" → name it `investment-dashboard` → Create
3. Upload all the files from this project to the repository:
   - Easiest method: On the repo page, click "Add file" → "Upload files" → drag the entire project folder contents
   - Make sure the folder structure is preserved (pages/, components/, styles/ etc.)

### Step 3: Deploy on Vercel

1. Go to https://vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Import your `investment-dashboard` repository
4. Before clicking "Deploy", expand "Environment Variables" and add:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `FMP_API_KEY` = your FMP key
5. Click "Deploy" — Vercel builds and gives you a URL (e.g. `investment-dashboard.vercel.app`)
6. Share that URL with your brother. Both of you access the same app.

### Step 4: Done

That's it. Every time you update code on GitHub, Vercel auto-redeploys in ~30 seconds.

---

## How to Use

### Qualitative Analysis
1. Type a ticker (e.g. `META`) and click Analyse
2. AI researches the company and generates 10-section qualitative analysis
3. Takes 30-60 seconds per company

### DCA Scorecard
1. Go to the DCA Scorecard tab
2. Open the company's 10-K on SEC.gov
3. Copy the financial statements (income statement, balance sheet, cash flow statement — 5 years)
4. Paste into the text area and click "Run DCA Scorecard"
5. AI scores 22 criteria with pass/warn/fail

### DCF Calculator
1. Go to the Intrinsic Value tab
2. Fill in owner's earnings, growth rate, and other assumptions for each scenario
3. Click Calculate — see probability-weighted intrinsic value and margin of safety

### Relative Valuation
1. Go to the Relative Valuation tab
2. Automatically fetches current multiples, historical averages, and peer comparison
3. Green = below average, Red = above average

---

## Costs

- **Anthropic API**: ~$0.10-0.30 per full analysis. Running 10 analyses/month ≈ $2-3/month.
- **FMP API**: Free tier covers everything.
- **Vercel**: Free tier covers everything.
- **Total**: ~$2-5/month depending on usage.

---

## File Structure

```
pages/
  index.js              → Main page and state management
  api/
    qualitative.js      → Anthropic API for qualitative analysis
    dca.js              → Anthropic API for DCA scorecard
    fmp.js              → Financial Modeling Prep data proxy
components/
  DCFCalculator.jsx     → Interactive DCF with scenarios
  RelativeValuation.jsx → Historical + peer ratio comparison
  DCAScorecard.jsx      → 22-criteria scorecard display
  Qualitative.jsx       → Qualitative analysis display
styles/
  globals.css           → All styling
```

To make changes: edit the specific file, push to GitHub, Vercel auto-redeploys.
