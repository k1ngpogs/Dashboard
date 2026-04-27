import { useState, useRef } from 'react';

export default function DCAScorecard({ ticker, scorecard, onRunAnalysis, loading }) {
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (manualMode) {
      if (!manualText.trim()) {
        alert('Please paste some financial data first.');
        return;
      }
      onRunAnalysis({ type: 'text', data: manualText });
    } else {
      if (!fileBase64) {
        alert('Please upload a PDF first.');
        return;
      }
      onRunAnalysis({ type: 'pdf', data: fileBase64 });
    }
  };

  const resultIcon = (result) => {
    if (result === 'pass') return '✅';
    if (result === 'warn') return '⚠️';
    if (result === 'fail') return '❌';
    return '—';
  };

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
      {!scorecard && (
        <div className="card">
          <div className="card-header">DCA Scorecard — Upload Financial Statements</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Export just the financial statement pages from the 10-K as a PDF (income statement,
            balance sheet, cash flow — 5 years). On Mac: File → Print → set page range → Save as PDF.
            Upload that here and the scorecard runs automatically.
          </p>

          {!manualMode ? (
            <div>
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = () => setFileBase64(reader.result.split(',')[1]);
                    reader.readAsDataURL(file);
                  }
                }}
              >
                {fileBase64 ? (
                  <>
                    <p style={{ color: 'var(--pass)', fontSize: 20, marginBottom: 8 }}>✓</p>
                    <p style={{ color: 'var(--pass)' }}>{fileName}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                      Ready to analyse — click Run DCA Scorecard below
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
                    <p>Click to upload PDF, or drag and drop</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                      Just the financial statement pages — not the full 10-K
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading || !fileBase64}
                >
                  {loading ? 'Analysing...' : 'Run DCA Scorecard'}
                </button>
                {fileBase64 && (
                  <button
                    className="btn-secondary"
                    onClick={() => { setFileBase64(''); setFileName(''); }}
                  >
                    Remove
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => setManualMode(true)}
                  style={{ marginLeft: 'auto', fontSize: 12 }}
                >
                  Paste text instead
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                Paste the financial statements directly — income statement, balance sheet, cash flow. 5 years of data.
              </p>
              <textarea
                className="financial-paste"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste financial data here..."
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading || !manualText.trim()}
                >
                  {loading ? 'Analysing...' : 'Run DCA Scorecard'}
                </button>
                <button className="btn-secondary" onClick={() => setManualMode(false)}>
                  Back to PDF upload
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">
            Running 22-criteria Buffett analysis on {ticker}...
          </div>
        </div>
      )}

      {scorecard && !loading && (
        <div>
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
                onClick={() => onRunAnalysis(null)}
                style={{ fontSize: 12 }}
              >
                Re-run
              </button>
            </div>

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
