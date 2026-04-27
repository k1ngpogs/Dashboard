import { useState } from 'react';

const defaultScenario = {
  ownerEarnings: '',
  growthRate: '',
  growthYears: '10',
  terminalGrowth: '2.5',
  discountRate: '12',
  sharesOutstanding: '',
  probability: '',
};

export default function DCFCalculator() {
  const [currentPrice, setCurrentPrice] = useState('');
  const [scenarios, setScenarios] = useState({
    bear: { ...defaultScenario, probability: '25', growthRate: '' },
    base: { ...defaultScenario, probability: '50', growthRate: '' },
    bull: { ...defaultScenario, probability: '25', growthRate: '' },
  });
  const [result, setResult] = useState(null);

  const updateScenario = (type, field, value) => {
    setScenarios((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const calculateDCF = (scenario) => {
    const oe = parseFloat(scenario.ownerEarnings);
    const gr = parseFloat(scenario.growthRate) / 100;
    const years = parseInt(scenario.growthYears);
    const tg = parseFloat(scenario.terminalGrowth) / 100;
    const dr = parseFloat(scenario.discountRate) / 100;
    const shares = parseFloat(scenario.sharesOutstanding);

    if ([oe, gr, years, tg, dr, shares].some(isNaN) || shares === 0 || dr <= tg) {
      return null;
    }

    // Project owner's earnings and discount
    let totalPV = 0;
    for (let i = 1; i <= years; i++) {
      const projectedOE = oe * Math.pow(1 + gr, i);
      const discounted = projectedOE / Math.pow(1 + dr, i);
      totalPV += discounted;
    }

    // Terminal value (Gordon Growth Model)
    const terminalOE = oe * Math.pow(1 + gr, years) * (1 + tg);
    const terminalValue = terminalOE / (dr - tg);
    const discountedTV = terminalValue / Math.pow(1 + dr, years);
    totalPV += discountedTV;

    const ivPerShare = totalPV / shares;
    return { totalPV, ivPerShare, terminalValue: discountedTV };
  };

  const runCalculation = () => {
    const bearResult = calculateDCF(scenarios.bear);
    const baseResult = calculateDCF(scenarios.base);
    const bullResult = calculateDCF(scenarios.bull);

    if (!bearResult || !baseResult || !bullResult) {
      alert('Please fill in all fields for all three scenarios.');
      return;
    }

    const bearProb = parseFloat(scenarios.bear.probability) / 100;
    const baseProb = parseFloat(scenarios.base.probability) / 100;
    const bullProb = parseFloat(scenarios.bull.probability) / 100;

    const weightedIV =
      bearResult.ivPerShare * bearProb +
      baseResult.ivPerShare * baseProb +
      bullResult.ivPerShare * bullProb;

    const price = parseFloat(currentPrice);
    const marginOfSafety = price ? ((weightedIV - price) / weightedIV) * 100 : null;

    setResult({
      bear: bearResult,
      base: baseResult,
      bull: bullResult,
      weightedIV,
      currentPrice: price,
      marginOfSafety,
    });
  };

  const formatCurrency = (n) => {
    if (n == null || isNaN(n)) return '—';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatLargeCurrency = (n) => {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    return '$' + n.toFixed(0);
  };

  const renderScenario = (type, label) => (
    <div className={`scenario-card ${type}`}>
      <h3>{label} ({scenarios[type].probability}%)</h3>
      <div className="form-group">
        <label className="form-label">Owner's Earnings ($M)</label>
        <input
          className="form-input"
          type="number"
          value={scenarios[type].ownerEarnings}
          onChange={(e) => updateScenario(type, 'ownerEarnings', e.target.value)}
          placeholder="e.g. 44200"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Annual Growth Rate (%)</label>
        <input
          className="form-input"
          type="number"
          value={scenarios[type].growthRate}
          onChange={(e) => updateScenario(type, 'growthRate', e.target.value)}
          placeholder={type === 'bear' ? 'e.g. 5' : type === 'base' ? 'e.g. 12' : 'e.g. 18'}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Growth Period (Years)</label>
        <input
          className="form-input"
          type="number"
          value={scenarios[type].growthYears}
          onChange={(e) => updateScenario(type, 'growthYears', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Terminal Growth (%)</label>
        <input
          className="form-input"
          type="number"
          step="0.1"
          value={scenarios[type].terminalGrowth}
          onChange={(e) => updateScenario(type, 'terminalGrowth', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Discount Rate (%)</label>
        <input
          className="form-input"
          type="number"
          step="0.1"
          value={scenarios[type].discountRate}
          onChange={(e) => updateScenario(type, 'discountRate', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Shares Outstanding (M)</label>
        <input
          className="form-input"
          type="number"
          value={scenarios[type].sharesOutstanding}
          onChange={(e) => updateScenario(type, 'sharesOutstanding', e.target.value)}
          placeholder="e.g. 2574"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Probability (%)</label>
        <input
          className="form-input"
          type="number"
          value={scenarios[type].probability}
          onChange={(e) => updateScenario(type, 'probability', e.target.value)}
        />
      </div>
      {result && result[type] && (
        <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg-primary)', borderRadius: 6 }}>
          <div className="form-label">Scenario IV / Share</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: type === 'bear' ? 'var(--fail)' : type === 'bull' ? 'var(--pass)' : 'var(--text-primary)' }}>
            {formatCurrency(result[type].ivPerShare)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="card">
        <div className="card-header">DCF Valuation — Bear / Base / Bull</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Uses Owner's Earnings (Net Income + D&A − 50% CapEx) as the cash flow input. All values in millions.
        </p>

        <div style={{ marginBottom: 20 }}>
          <div className="form-group" style={{ maxWidth: 320 }}>
            <label className="form-label">Current Share Price ($)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="e.g. 645.00"
            />
          </div>
        </div>

        <div className="scenario-grid">
          {renderScenario('bear', 'Bear Case')}
          {renderScenario('base', 'Base Case')}
          {renderScenario('bull', 'Bull Case')}
        </div>

        <button className="btn-primary" onClick={runCalculation} style={{ width: '100%' }}>
          Calculate Intrinsic Value
        </button>
      </div>

      {result && (
        <div className="card">
          <div className="dcf-result">
            <div>
              <div className="dcf-result-label">Probability-Weighted Intrinsic Value</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {scenarios.bear.probability}% Bear / {scenarios.base.probability}% Base / {scenarios.bull.probability}% Bull
              </div>
            </div>
            <div className="dcf-result-value">{formatCurrency(result.weightedIV)}</div>
          </div>

          <div className="dcf-meta">
            <div className="dcf-meta-item">
              <div className="value" style={{ color: 'var(--fail)' }}>
                {formatCurrency(result.bear.ivPerShare)}
              </div>
              <div className="label">Bear IV</div>
            </div>
            <div className="dcf-meta-item">
              <div className="value">{formatCurrency(result.base.ivPerShare)}</div>
              <div className="label">Base IV</div>
            </div>
            <div className="dcf-meta-item">
              <div className="value" style={{ color: 'var(--pass)' }}>
                {formatCurrency(result.bull.ivPerShare)}
              </div>
              <div className="label">Bull IV</div>
            </div>
            <div className="dcf-meta-item">
              <div
                className="value"
                style={{
                  color: result.marginOfSafety > 25
                    ? 'var(--pass)'
                    : result.marginOfSafety > 0
                    ? 'var(--warn)'
                    : 'var(--fail)',
                }}
              >
                {result.marginOfSafety != null ? result.marginOfSafety.toFixed(1) + '%' : '—'}
              </div>
              <div className="label">Margin of Safety</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
