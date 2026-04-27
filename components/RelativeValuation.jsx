import { useState, useEffect } from 'react';

export default function RelativeValuation({ ticker }) {
  const [overview, setOverview] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, earningsRes] = await Promise.all([
        fetch(`/api/av?function=OVERVIEW&symbol=${ticker}`),
        fetch(`/api/av?function=EARNINGS&symbol=${ticker}`),
      ]);

      const overviewData = await overviewRes.json();
      const earningsData = await earningsRes.json();

      if (overviewData.error) throw new Error(overviewData.error);
      if (!overviewData.Symbol) throw new Error('No data returned. Check your AV_API_KEY in Vercel environment variables.');

      setOverview(overviewData);
      setEarnings(earningsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ticker]);

  if (!ticker) return (
    <div className="empty-state">
      <h2>No ticker selected</h2>
      <p>Enter a ticker symbol above to see relative valuation data</p>
    </div>
  );

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <div className="loading-text">Fetching valuation data for {ticker}...</div>
    </div>
  );

  if (error) return (
    <div className="card">
      <p style={{ color: 'var(--fail)' }}>Error: {error}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
        Make sure AV_API_KEY is set in Vercel environment variables and redeployed.
      </p>
      <button className="btn-secondary" onClick={fetchData} style={{ marginTop: 12 }}>
        Retry
      </button>
    </div>
  );

  if (!overview) return null;

  const fmt = (v, decimals = 1, suffix = 'x') => {
    const n = parseFloat(v);
    if (!v || isNaN(n) || v === 'None' || v === '-') return '—';
    return n.toFixed(decimals) + suffix;
  };

  const fmtB = (v) => {
    const n = parseFloat(v);
    if (!v || isNaN(n) || v === 'None') return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    return '$' + n.toFixed(0);
  };

  const fmtPct = (v) => {
    const n = parseFloat(v);
    if (!v || isNaN(n) || v === 'None') return '—';
    return (n * 100).toFixed(1) + '%';
  };

  // Key ratios from overview
  const currentRatios = [
    { label: 'P/E (TTM)', value: fmt(overview.TrailingPE) },
    { label: 'Forward P/E', value: fmt(overview.ForwardPE) },
    { label: 'P/S', value: fmt(overview.PriceToSalesRatioTTM) },
    { label: 'P/B', value: fmt(overview.PriceToBookRatio) },
    { label: 'EV/EBITDA', value: fmt(overview.EVToEBITDA) },
    { label: 'EV/Revenue', value: fmt(overview.EVToRevenue) },
    { label: 'PEG Ratio', value: fmt(overview.PEGRatio) },
    { label: 'Div Yield', value: fmtPct(overview.DividendYield) },
  ];

  // Profitability metrics
  const profitMetrics = [
    { label: 'Gross Margin', value: fmtPct(overview.GrossProfitTTM && overview.RevenueTTM ? overview.GrossProfitTTM / overview.RevenueTTM : null) },
    { label: 'Profit Margin', value: fmtPct(overview.ProfitMargin) },
    { label: 'Operating Margin', value: fmtPct(overview.OperatingMarginTTM) },
    { label: 'ROE', value: fmtPct(overview.ReturnOnEquityTTM) },
    { label: 'ROA', value: fmtPct(overview.ReturnOnAssetsTTM) },
    { label: 'Revenue (TTM)', value: fmtB(overview.RevenueTTM) },
    { label: 'EPS (TTM)', value: fmt(overview.EPS, 2, '') ? '$' + fmt(overview.EPS, 2, '') : '—' },
    { label: 'Market Cap', value: fmtB(overview.MarketCapitalization) },
  ];

  // Historical P/E from earnings data
  const annualEarnings = earnings?.annualEarnings?.slice(0, 8) || [];

  return (
    <div>
      {/* Company overview strip */}
      <div className="card">
        <div className="card-header">{overview.Name} ({ticker})</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
          {overview.Description?.slice(0, 300)}{overview.Description?.length > 300 ? '...' : ''}
        </p>
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sector</span><div style={{ fontSize: 14, marginTop: 2 }}>{overview.Sector || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Industry</span><div style={{ fontSize: 14, marginTop: 2 }}>{overview.Industry || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Exchange</span><div style={{ fontSize: 14, marginTop: 2 }}>{overview.Exchange || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>52W High</span><div style={{ fontSize: 14, marginTop: 2 }}>${overview['52WeekHigh'] || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>52W Low</span><div style={{ fontSize: 14, marginTop: 2 }}>${overview['52WeekLow'] || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Analyst Target</span><div style={{ fontSize: 14, marginTop: 2 }}>${overview.AnalystTargetPrice || '—'}</div></div>
        </div>
      </div>

      {/* Current valuation multiples */}
      <div className="card">
        <div className="card-header">Current Valuation Multiples</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Live data from Alpha Vantage. For historical comparison, use Macrotrends.net.
        </p>
        <div className="ratio-grid">
          {currentRatios.map((r) => (
            <div className="ratio-card" key={r.label}>
              <div className="ratio-name">{r.label}</div>
              <div className="ratio-current" style={{ color: 'var(--text-primary)' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profitability */}
      <div className="card">
        <div className="card-header">Profitability & Scale</div>
        <div className="ratio-grid">
          {profitMetrics.map((r) => (
            <div className="ratio-card" key={r.label}>
              <div className="ratio-name">{r.label}</div>
              <div className="ratio-current" style={{ color: 'var(--text-primary)' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical EPS */}
      {annualEarnings.length > 0 && (
        <div className="card">
          <div className="card-header">Historical EPS (Annual)</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Use this to assess EPS trend — a key Buffett criterion.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  {annualEarnings.map((e) => (
                    <th className="num" key={e.fiscalDateEnding}>{e.fiscalDateEnding?.slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label">EPS</td>
                  {annualEarnings.map((e) => (
                    <td className="num" key={e.fiscalDateEnding}>
                      {e.reportedEPS !== 'None' ? '$' + parseFloat(e.reportedEPS).toFixed(2) : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual comparison note */}
      <div className="card">
        <div className="card-header">Historical Comparison</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
          For 5-year and 10-year historical P/E, EV/EBITDA, and P/FCF averages, the best free source is{' '}
          <strong style={{ color: 'var(--accent)' }}>Macrotrends.net</strong> — search the ticker there and
          you'll see full ratio history going back 10+ years. Compare those averages to the current multiples
          above to assess whether the stock is cheap or expensive relative to its own history.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          For peer comparison, <strong style={{ color: 'var(--accent)' }}>Simply Wall St</strong> or{' '}
          <strong style={{ color: 'var(--accent)' }}>Tikr.com</strong> (free tier) give side-by-side
          competitor multiples.
        </p>
      </div>
    </div>
  );
}
