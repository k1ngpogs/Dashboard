import { useState, useEffect } from 'react';

export default function RelativeValuation({ ticker }) {
  const [ratios, setRatios] = useState(null);
  const [ttmRatios, setTtmRatios] = useState(null);
  const [peers, setPeers] = useState(null);
  const [peerRatios, setPeerRatios] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [ratiosRes, ttmRes, peersRes, quoteRes] = await Promise.all([
        fetch(`/api/fmp?endpoint=ratios&symbol=${ticker}&limit=10`),
        fetch(`/api/fmp?endpoint=key-metrics-ttm&symbol=${ticker}`),
        fetch(`/api/fmp?endpoint=stock_peers&symbol=${ticker}`),
        fetch(`/api/fmp?endpoint=quote&symbol=${ticker}`),
      ]);

      const ratiosData = await ratiosRes.json();
      const ttmData = await ttmRes.json();
      const peersData = await peersRes.json();
      const quoteData = await quoteRes.json();

      if (ratiosData.error) throw new Error(ratiosData.error);

      setRatios(Array.isArray(ratiosData) ? ratiosData : []);
      setTtmRatios(Array.isArray(ttmData) ? ttmData[0] : ttmData);

      // Get peer tickers
      const peerList = peersData?.[0]?.peersList || [];
      setPeers(peerList.slice(0, 4));

      // Fetch peer ratios
      if (peerList.length > 0) {
        const peerPromises = peerList.slice(0, 4).map(async (p) => {
          const res = await fetch(`/api/fmp?endpoint=ratios-ttm&symbol=${p}`);
          const data = await res.json();
          const qRes = await fetch(`/api/fmp?endpoint=quote&symbol=${p}`);
          const qData = await qRes.json();
          return { ticker: p, ratios: Array.isArray(data) ? data[0] : data, quote: Array.isArray(qData) ? qData[0] : qData };
        });
        const peerResults = await Promise.all(peerPromises);
        const peerMap = {};
        peerResults.forEach((pr) => {
          peerMap[pr.ticker] = { ...pr.ratios, ...pr.quote };
        });
        setPeerRatios(peerMap);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ticker]);

  if (!ticker) {
    return (
      <div className="empty-state">
        <h2>No ticker selected</h2>
        <p>Enter a ticker symbol above to see relative valuation data</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <div className="loading-text">Fetching valuation data for {ticker}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: 'var(--fail)' }}>Error loading FMP data: {error}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          Make sure your FMP_API_KEY is set in Vercel environment variables.
        </p>
      </div>
    );
  }

  if (!ratios || ratios.length === 0) return null;

  // Define which ratios to display
  const ratioConfig = [
    { key: 'peRatioTTM', historicalKey: 'priceEarningsRatio', label: 'P/E', decimals: 1 },
    { key: 'enterpriseValueOverEBITDATTM', historicalKey: 'enterpriseValueOverEBITDA', label: 'EV/EBITDA', decimals: 1 },
    { key: 'priceToFreeCashFlowsRatioTTM', historicalKey: 'priceToFreeCashFlowsRatio', label: 'P/FCF', decimals: 1 },
    { key: 'priceToSalesRatioTTM', historicalKey: 'priceToSalesRatio', label: 'P/S', decimals: 1 },
    { key: 'priceToBookRatioTTM', historicalKey: 'priceToBookRatio', label: 'P/B', decimals: 1 },
    { key: 'evToSalesTTM', historicalKey: null, label: 'EV/Revenue', decimals: 1 },
    { key: 'freeCashFlowYieldTTM', historicalKey: null, label: 'FCF Yield', decimals: 1, pct: true },
    { key: 'dividendYieldTTM', historicalKey: 'dividendYield', label: 'Div Yield', decimals: 2, pct: true },
  ];

  const getAverage = (arr) => {
    const valid = arr.filter((v) => v != null && !isNaN(v) && isFinite(v) && v > 0);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const getSignalClass = (current, avg) => {
    if (!current || !avg) return 'signal-fair';
    const ratio = current / avg;
    if (ratio < 0.85) return 'signal-cheap';
    if (ratio > 1.15) return 'signal-expensive';
    return 'signal-fair';
  };

  const formatVal = (v, decimals, pct) => {
    if (v == null || isNaN(v) || !isFinite(v)) return '—';
    if (pct) return (v * 100).toFixed(decimals) + '%';
    return v.toFixed(decimals) + 'x';
  };

  return (
    <div>
      {/* Historical Valuation */}
      <div className="card">
        <div className="card-header">Historical Valuation — {ticker}</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Current multiples vs 5-year and 10-year averages. Green = below average (potentially cheap). Red = above average (potentially expensive).
        </p>

        <div className="ratio-grid">
          {ratioConfig.map((rc) => {
            const current = ttmRatios?.[rc.key];
            const historicalValues = rc.historicalKey
              ? ratios.map((r) => r[rc.historicalKey]).filter((v) => v != null && isFinite(v) && v > 0)
              : [];
            const avg5 = getAverage(historicalValues.slice(0, 5));
            const avg10 = getAverage(historicalValues.slice(0, 10));

            return (
              <div className="ratio-card" key={rc.key}>
                <div className="ratio-name">{rc.label}</div>
                <div className={`ratio-current ${getSignalClass(rc.pct ? current : current, avg5)}`}>
                  {formatVal(current, rc.decimals, rc.pct)}
                </div>
                <div className="ratio-row">
                  <span>5yr avg</span>
                  <span className="val">{avg5 ? formatVal(avg5, rc.decimals, rc.pct) : '—'}</span>
                </div>
                <div className="ratio-row">
                  <span>10yr avg</span>
                  <span className="val">{avg10 ? formatVal(avg10, rc.decimals, rc.pct) : '—'}</span>
                </div>
                {historicalValues.length > 0 && avg5 && current && (
                  <div className="ratio-row" style={{ marginTop: 4, borderTop: '1px solid var(--border-light)', paddingTop: 6 }}>
                    <span>vs 5yr</span>
                    <span className={`val ${getSignalClass(current, avg5)}`}>
                      {(((current - avg5) / avg5) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Peer Comparison */}
      {peers && peers.length > 0 && (
        <div className="card">
          <div className="card-header">Peer Comparison</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            {ticker} vs comparable companies on key valuation multiples.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="peer-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>P/E</th>
                  <th>EV/EBITDA</th>
                  <th>P/FCF</th>
                  <th>P/S</th>
                  <th>P/B</th>
                </tr>
              </thead>
              <tbody>
                <tr className="highlight">
                  <td>{ticker}</td>
                  <td>{formatVal(ttmRatios?.peRatioTTM, 1)}</td>
                  <td>{formatVal(ttmRatios?.enterpriseValueOverEBITDATTM, 1)}</td>
                  <td>{formatVal(ttmRatios?.priceToFreeCashFlowsRatioTTM, 1)}</td>
                  <td>{formatVal(ttmRatios?.priceToSalesRatioTTM, 1)}</td>
                  <td>{formatVal(ttmRatios?.priceToBookRatioTTM, 1)}</td>
                </tr>
                {peers.map((p) => {
                  const pr = peerRatios[p];
                  return (
                    <tr key={p}>
                      <td>{p}</td>
                      <td>{formatVal(pr?.peRatioTTM, 1)}</td>
                      <td>{formatVal(pr?.enterpriseValueOverEBITDATTM, 1)}</td>
                      <td>{formatVal(pr?.priceToFreeCashFlowsRatioTTM, 1)}</td>
                      <td>{formatVal(pr?.priceToSalesRatioTTM, 1)}</td>
                      <td>{formatVal(pr?.priceToBookRatioTTM, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
