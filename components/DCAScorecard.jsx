import { useState } from 'react';

export default function DCAScorecard({ ticker, scorecard, onRunAnalysis, loading }) {
  const [financialData, setFinancialData] = useState('');

  const handleSubmit = () => {
    if (!financialData.trim()) {
      alert('Please paste the financial statement data first.');
      return;
    }
    onRunAnalysis(financialData);
  };

  const resultIcon = (result) => {
    if (result === 'pass') return '✅';
    if (result === 'warn') return '⚠️';
    if (result === 'fail') return '❌';
    return '—';
  };

  // Group criteria by category
  const groupCriteria = (criteria) => {
    const groups = {};
    criteria.forEach((c) => {
      const cat = c.category || 'OTHER';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return groups;
  };

  return (
    <div>
      {/* Input Area */}
      {!scorecard && (
        <div className="card">
          <div className="card-header">DCA Scorecard — Paste Financial Statements</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Paste the income statement, balance sheet, and cash flow statement from the company's 10-K filing.
            5 years of data is ideal. Copy directly from the SEC filing — tables, numbers, all of it.
          </p>

          <textarea
            className="financial-paste"
            value={financialData}
            onChange={(e) => setFinancialData(e.target.value)}
            placeholder={`Paste financial statements here. Example format:\n\nConsolidated Statements of Income (in millions)\n                          2024      2023      2022      2021      2020\nRevenue                 164,501   134,902   116,609   117,929    85,965\nCost of revenue          30,161    25,959    25,249    22,649    16,692\nGross profit           134,340   108,943    91,360    95,280    69,273\n...`}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !financialData.trim()}
            >
              {loading ? 'Analysing...' : 'Run DCA Scorecard'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">
            Running 22-criteria Buffett analysis on {ticker}...
          </div>
        </div>
      )}

      {/* Results */}
      {scorecard && !loading && (
        <div>
          {/* Summary Header */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div className="card-header" style={{ marginBottom: 4 }}>
                  {scorecard.company || ticker} — DCA Scorecard
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Warren Buffett / Mary Buffett framework · {scorecard.years?.length || 5}-year analysis · $M
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => { onRunAnalysis(null); }}
                style={{ fontSize: 12 }}
              >
                Re-run
              </button>
            </div>

            {/* Score pills */}
            <div className="score-summary">
              <div className="score-pill pass-pill">
                <div className="number">{scorecard.summary?.pass_count || 0}</div>
                <div className="label">Pass</div>
              </div>
              <div className="score-pill warn-pill">
                <div className="number">{scorecard.summary?.warn_count || 0}</div>
                <div className="label">Warn</div>
              </div>
              <div className="score-pill fail-pill">
                <div className="number">{scorecard.summary?.fail_count || 0}</div>
                <div className="label">Fail</div>
              </div>
            </div>

            {/* Verdict */}
            <div className="verdict-box">
              <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
                Overall verdict: {scorecard.summary?.verdict || '—'}
              </div>
              <div className="signal-box">
                <div className="signal-card strength">
                  <h4>Strongest Signal</h4>
                  <p>{scorecard.summary?.strongest_signal || '—'}</p>
                </div>
                <div className="signal-card risk">
                  <h4>Biggest Risk</h4>
                  <p>{scorecard.summary?.biggest_risk || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Raw Financials Table */}
          {scorecard.raw_financials && (
            <div className="card">
              <div className="card-header">Raw Financials ($M)</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {(scorecard.years || []).map((y) => (
                        <th className="num" key={y}>{y}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(scorecard.raw_financials).map(([key, values]) => {
                      const label = key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                        .replace('Dna', 'D&A')
                        .replace('Lt Debt', 'LT Debt')
                        .replace('St Debt', 'ST Debt')
                        .replace('Operating Cf', 'Operating CF')
                        .replace('Eps', 'EPS');

                      return (
                        <tr key={key}>
                          <td className="label">{label}</td>
                          {(values || []).map((v, i) => (
                            <td className="num" key={i}>
                              {v != null
                                ? key === 'eps'
                                  ? '$' + parseFloat(v).toFixed(2)
                                  : parseFloat(v).toLocaleString()
                                : '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Criteria Breakdown */}
          <div className="card">
            <div className="card-header">22 Criteria Breakdown</div>
            {scorecard.criteria && (() => {
              const groups = groupCriteria(scorecard.criteria);
              return Object.entries(groups).map(([category, items]) => (
                <div key={category}>
                  <div className="card-subheader" style={{ marginTop: 24 }}>{category}</div>
                  {items.map((c) => (
                    <div className="criterion" key={c.number}>
                      <div className="criterion-header">
                        <span className={`badge ${c.result}`}>{resultIcon(c.result)} {c.result}</span>
                        <span className="criterion-title">{c.number}. {c.name}</span>
                      </div>
                      {c.values && (
                        <div className="criterion-values">
                          {typeof c.values === 'object'
                            ? Object.entries(c.values).map(([yr, val]) => `${yr}: ${val}`).join(' · ')
                            : c.values}
                          {c.threshold && ` — threshold: ${c.threshold}`}
                        </div>
                      )}
                      <div className="criterion-explanation">{c.explanation}</div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
