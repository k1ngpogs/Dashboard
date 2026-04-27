import { useState, useCallback, useEffect } from 'react';
import DCFCalculator from '../components/DCFCalculator';
import RelativeValuation from '../components/RelativeValuation';
import DCAScorecard from '../components/DCAScorecard';
import Qualitative from '../components/Qualitative';

const TABS = [
  { id: 'qualitative', label: 'Qualitative' },
  { id: 'dca', label: 'DCA Scorecard' },
  { id: 'dcf', label: 'Intrinsic Value (DCF)' },
  { id: 'relative', label: 'Relative Valuation' },
];

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [activeTicker, setActiveTicker] = useState('');
  const [activeTab, setActiveTab] = useState('qualitative');
  const [savedTickers, setSavedTickers] = useState([]);

  const [qualAnalysis, setQualAnalysis] = useState(null);
  const [qualLoading, setQualLoading] = useState(false);
  const [qualError, setQualError] = useState(null);
  const [qualSavedAt, setQualSavedAt] = useState(null);

  const [dcaScorecard, setDcaScorecard] = useState(null);
  const [dcaLoading, setDcaLoading] = useState(false);

  // In-memory cache — persists for the entire browser session
  const [cache, setCache] = useState({});

  useEffect(() => {
    async function loadTickers() {
      try {
        const res = await fetch('/api/get-analyses');
        const data = await res.json();
        if (data.tickers && data.tickers.length > 0) {
          setSavedTickers(data.tickers);
        }
      } catch (err) {
        console.error('Failed to load saved tickers:', err);
      }
    }
    loadTickers();
  }, []);

  const saveToKV = async (symbol, type, data) => {
    try {
      await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, type, data }),
      });
    } catch (err) {
      console.error('Failed to save to KV:', err);
    }
  };

  const loadFromKV = async (symbol) => {
    try {
      const res = await fetch('/api/get-analyses?ticker=' + symbol);
      return await res.json();
    } catch (err) {
      return null;
    }
  };

  const loadTicker = useCallback(async (symbol, forceRerun = false) => {
    // Always check in-memory cache first — zero cost, instant
    if (!forceRerun && cache[symbol]?.qualitative) {
      setActiveTicker(symbol);
      setTicker(symbol);
      setQualAnalysis(cache[symbol].qualitative);
      setQualSavedAt(cache[symbol].qualSavedAt || null);
      setDcaScorecard(cache[symbol].dca || null);
      setQualError(null);
      return;
    }

    // Then check KV — also free
    if (!forceRerun) {
      const saved = await loadFromKV(symbol);
      if (saved?.qualitative?.data) {
        const cachedData = {
          qualitative: saved.qualitative.data,
          qualSavedAt: saved.qualitative.savedAt,
          dca: saved.dca?.data || null,
        };
        setCache(prev => ({ ...prev, [symbol]: cachedData }));
        setActiveTicker(symbol);
        setTicker(symbol);
        setQualAnalysis(saved.qualitative.data);
        setQualSavedAt(saved.qualitative.savedAt);
        setDcaScorecard(saved.dca?.data || null);
        setQualError(null);
        return;
      }
    }

    // Nothing cached — run fresh analysis
    setActiveTicker(symbol);
    setTicker(symbol);
    setQualAnalysis(null);
    setDcaScorecard(null);
    setQualSavedAt(null);
    setQualError(null);
    setQualLoading(true);

    try {
      const res = await fetch('/api/qualitative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol }),
      });

      const data = await res.json();
      if (data.error) { setQualError(data.error); return; }

      const result = data.parseError ? { raw: data.raw, parseError: true } : data.analysis;
      const savedAt = new Date().toISOString();

      setQualAnalysis(result);
      setQualSavedAt(savedAt);
      await saveToKV(symbol, 'qualitative', result);

      setCache(prev => ({
        ...prev,
        [symbol]: { ...prev[symbol], qualitative: result, qualSavedAt: savedAt },
      }));
    } catch (err) {
      setQualError(err.message);
    } finally {
      setQualLoading(false);
    }
  }, [cache]);

  const runDCAAnalysis = useCallback(async (financialData) => {
    if (financialData === null) { setDcaScorecard(null); return; }

    setDcaLoading(true);
    try {
      const res = await fetch('/api/dca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: activeTicker, financialData }),
      });

      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); return; }

      const result = data.parseError ? null : data.scorecard;
      setDcaScorecard(result);

      if (result) {
        await saveToKV(activeTicker, 'dca', result);
        setCache(prev => ({
          ...prev,
          [activeTicker]: { ...prev[activeTicker], dca: result },
        }));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDcaLoading(false);
    }
  }, [activeTicker]);

  const handleAnalyze = async () => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;
    if (!savedTickers.includes(symbol)) {
      setSavedTickers(prev => [symbol, ...prev]);
    }
    await loadTicker(symbol);
  };

  const handleSavedClick = async (symbol) => {
    await loadTicker(symbol);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-title">Investment Analysis</div>
        <div className="app-subtitle">Buffett Framework</div>
      </div>

      {savedTickers.length > 0 && (
        <div className="saved-bar">
          {savedTickers.map((s) => (
            <button
              key={s}
              className={`saved-chip ${s === activeTicker ? 'active' : ''}`}
              onClick={() => handleSavedClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="input-section">
        <input
          className="ticker-input"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter ticker symbol (e.g. META)"
        />
        <button
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={!ticker.trim() || qualLoading}
        >
          {qualLoading ? 'Analysing...' : 'Analyse'}
        </button>
        {activeTicker && !qualLoading && (
          <button
            className="btn-secondary"
            onClick={() => loadTicker(activeTicker, true)}
            title="Force re-run (costs tokens)"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {activeTicker && (
        <>
          <div className="tab-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {qualSavedAt && activeTab === 'qualitative' && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Saved {new Date(qualSavedAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })} · visible to all users
            </p>
          )}

          {activeTab === 'qualitative' && (
            <Qualitative ticker={activeTicker} analysis={qualAnalysis} loading={qualLoading} error={qualError} />
          )}
          {activeTab === 'dca' && (
            <DCAScorecard ticker={activeTicker} scorecard={dcaScorecard} onRunAnalysis={runDCAAnalysis} loading={dcaLoading} />
          )}
          {activeTab === 'dcf' && <DCFCalculator />}
          {activeTab === 'relative' && <RelativeValuation ticker={activeTicker} />}
        </>
      )}

      {!activeTicker && (
        <div className="empty-state">
          <h2>Enter a ticker to begin</h2>
          <p>Analyses save automatically and are shared across all users. Click any saved ticker above to reload instantly.</p>
        </div>
      )}
    </div>
  );
}
