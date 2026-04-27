import { useState, useRef } from 'react';

export default function DCAScorecard({ ticker, scorecard, onRunAnalysis, loading }) {
  const [files, setFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef(null);

  const loadPDFJS = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const extractTextFromPDF = async (file) => {
    await loadPDFJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let text = `\n=== ${file.name} ===\n`;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    if (!selected.length) { alert('PDF files only.'); return; }
    if (selected.length + files.length > 5) { alert('Maximum 5 files.'); return; }
    setExtracting(true);
    try {
      const newFiles = await Promise.all(selected.map(async (f) => ({
        name: f.name,
        text: await extractTextFromPDF(f),
      })));
      setFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      alert('Error reading PDF: ' + err.message);
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (!dropped.length) return;
    if (dropped.length + files.length > 5) { alert('Maximum 5 files.'); return; }
    setExtracting(true);
    try {
      const newFiles = await Promise.all(dropped.map(async (f) => ({
        name: f.name,
        text: await extractTextFromPDF(f),
      })));
      setFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      alert('Error reading PDF: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    if (manualMode) {
      if (!manualText.trim()) { alert('Please paste financial data first.'); return; }
      onRunAnalysis({ type: 'text', data: manualText });
    } else {
      if (!files.length) { alert('Please upload at least one PDF.'); return; }
      const combined = files.map(f => f.text).join('\n\n');
      onRunAnalysis({ type: 'text', data: combined });
    }
  };

  const resultIcon = (r) => r === 'pass' ? '✅' : r === 'warn' ? '⚠️' : r === 'fail' ? '❌' : '—';

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
            Upload up to 5 PDFs — one per year. Export just the financial statement pages from each 10-K
            (income statement, balance sheet, cash flow). On Mac: open in Preview → File → Print → set page range → Save as PDF.
          </p>

          {!manualMode ? (
            <div>
              <div
                className="upload-area"
                onClick={() => !extracting && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{ cursor: extracting ? 'wait' : 'pointer' }}
              >
                {extracting ? (
                  <>
                    <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                    <p>Extracting text from PDF...</p>
                  </>
                ) : files.length === 0 ? (
                  <>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
                    <p>Click to upload PDFs, or drag and drop</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                      Up to 5 files · Financial statement pages only
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                      {files.length}/5 files ready · Click to add more
                    </p>
                    {files.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--bg-primary)', borderRadius: 6, padding: '8px 12px', marginBottom: 6
                      }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ color: 'var(--pass)', fontSize: 13 }}>✓ {f.name}</span>
                        <button onClick={() => removeFile(i)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                          ×
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept=".pdf" multiple
                style={{ display: 'none' }} onChange={handleFileChange} />

              <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
                <button className="btn-primary" onClick={handleSubmit}
                  disabled={loading || extracting || !files.length}>
                  {loading ? 'Analysing...' : 'Run DCA Scorecard'}
                </button>
                {files.length > 0 && (
                  <button className="btn-secondary" onClick={() => setFiles([])}>Clear all</button>
                )}
                <button className="btn-secondary" onClick={() => setManualMode(true)}
                  style={{ marginLeft: 'auto', fontSize: 12 }}>
                  Paste text instead
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                Paste financial statements — income statement, balance sheet, cash flow. 5 years of data.
              </p>
              <textarea className="financial-paste" value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste financial data here..." />
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn-primary" onClick={handleSubmit}
                  disabled={loading || !manualText.trim()}>
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
          <div className="loading-text">Running 22-criteria Buffett analysis on {ticker}...</div>
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
              <button className="btn-secondary" onClick={() => onRunAnalysis(null)} style={{ fontSize: 12 }}>
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
                      {(scorecard.years || []).map((y) => <th className="num" key={y}>{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(scorecard.raw_financials).map(([key, values]) => {
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        .replace('Dna', 'D&A').replace('Lt Debt', 'LT Debt').replace('St Debt', 'ST Debt')
                        .replace('Operating Cf', 'Operating CF').replace('Eps', 'EPS');
                      return (
                        <tr key={key}>
                          <td className="label">{label}</td>
                          {(values || []).map((v, i) => (
                            <td className="num" key={i}>
                              {v != null ? (key === 'eps' ? '$' + parseFloat(v).toFixed(2) : parseFloat(v).toLocaleString()) : '—'}
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
