export default function Qualitative({ ticker, analysis, loading, error }) {
  const sections = [
    { key: 'business_model', title: 'Business Model & Revenue Mix' },
    { key: 'customers', title: 'Customers & Stickiness' },
    { key: 'tam_and_growth', title: 'TAM & Growth Runway' },
    { key: 'competitive_landscape', title: 'Competitive Landscape' },
    { key: 'moat', title: 'Moat — Type, Evidence & Trajectory' },
    { key: 'management', title: 'Management & Communication' },
    { key: 'capital_allocation_and_ownership', title: 'Capital Allocation & Ownership' },
    { key: 'regulatory_legal', title: 'Regulatory & Legal Exposure' },
    { key: 'key_risks_and_kpis', title: 'Key Risks & KPIs to Monitor' },
  ];

  if (!ticker) return (
    <div className="empty-state">
      <h2>No company selected</h2>
      <p>Enter a ticker symbol above to run qualitative analysis</p>
    </div>
  );

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <div className="loading-text">Researching {ticker} — this takes 30-60 seconds...</div>
    </div>
  );

  if (error) return (
    <div className="card">
      <p style={{ color: 'var(--fail)' }}>Error: {error}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
        Make sure your ANTHROPIC_API_KEY is set correctly in Vercel environment variables.
      </p>
    </div>
  );

  if (!analysis) return null;

  if (analysis.parseError) return (
    <div className="card">
      <div className="card-header">Qualitative Analysis — {ticker}</div>
      <p style={{ color: 'var(--warn)', fontSize: 13, marginBottom: 12 }}>
        Response could not be parsed as structured data. Raw output:
      </p>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        {analysis.raw}
      </div>
    </div>
  );

  return (
    <div>
      <div className="card">
        <div className="card-header">Qualitative Analysis — {ticker}</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          AI-generated from live web sources as of April 2026. Verify critical facts independently.
        </p>
      </div>

      {sections.map((section) => {
        const content = analysis[section.key];
        if (!content) return null;
        const paragraphs = content.split('\n').filter((p) => p.trim());
        return (
          <div className="card" key={section.key}>
            <div className="qual-section">
              <div className="qual-section-title">{section.title}</div>
              <div className="qual-section-body">
                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
