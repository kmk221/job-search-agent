import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const STAGES = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E+', 'Public', 'Private', 'Unknown'];
const SOURCES = ['Manual entry', "Lenny's Newsletter", 'LinkedIn', 'Referral', 'VC Portfolio', 'Other'];

const initialForm = {
  link: '',
  title: '',
  company: '',
  companyUrl: '',
  location: '',
  remote: false,
  salary: '',
  salaryMin: '',
  stage: 'Unknown',
  industry: '',
  jobDescription: '',
  source: 'Manual entry',
};

export default function AddJobModal({ onClose, onSaved }) {
  const [step, setStep] = useState('form'); // form | scoring | preview | saving
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [score, setScore] = useState(null);
  const [apiError, setApiError] = useState(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (firstFieldRef.current) firstFieldRef.current.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && step !== 'scoring' && step !== 'saving') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'salary' && !prev.salaryMin) {
        const inferred = inferSalaryMin(value);
        if (inferred !== null) next.salaryMin = String(inferred);
      }
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.link.trim()) next.link = 'Required';
    if (!form.title.trim()) next.title = 'Required';
    if (!form.company.trim()) next.company = 'Required';
    if (!form.location.trim()) next.location = 'Required';
    if (!form.jobDescription.trim()) next.jobDescription = 'Required';
    if (form.salaryMin && !/^\d+$/.test(String(form.salaryMin).trim())) {
      next.salaryMin = 'Must be a number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError(null);
    setStep('scoring');

    try {
      const res = await fetch('/api/score-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTitle: form.title.trim(),
          company: form.company.trim(),
          jobDescription: form.jobDescription.trim(),
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          location: form.location.trim(),
          stage: form.stage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Scoring failed (${res.status})`);
      }
      setScore(data);
      setStep('preview');
    } catch (err) {
      setApiError(err.message || 'Failed to score this job.');
      setStep('form');
    }
  };

  const handleSave = async () => {
    if (!score) return;
    setStep('saving');
    setApiError(null);
    try {
      const res = await fetch('/api/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          company: form.company.trim(),
          companyUrl: form.companyUrl.trim() || null,
          location: form.remote ? `Remote — ${form.location.trim()}` : form.location.trim(),
          salary: form.salary.trim() || null,
          stage: form.stage,
          industry: form.industry
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .join('/'),
          link: form.link.trim(),
          fitScore: score.fitScore,
          fitReasoning: score.whyGoodFit,
          northStarMatch: score.northStarMatch,
          source: form.source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      onSaved({
        pageUrl: data.pageUrl,
        title: form.title.trim(),
        company: form.company.trim(),
      });
    } catch (err) {
      setApiError(err.message || 'Failed to save to Notion.');
      setStep('preview');
    }
  };

  const handleBackToForm = () => {
    setApiError(null);
    setStep('form');
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && step !== 'scoring' && step !== 'saving' && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-job-title">
        <div className="modal-header">
          <h2 id="add-job-title">
            {step === 'preview' || step === 'saving' ? 'Preview & save' : 'Add a job manually'}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={step === 'scoring' || step === 'saving'}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {apiError && (
          <div className="modal-alert">
            <AlertCircle className="modal-alert-icon" />
            <span>{apiError}</span>
          </div>
        )}

        {(step === 'form' || step === 'scoring') && (
          <form className="modal-body" onSubmit={handleAnalyze}>
            <Field
              label="Job URL"
              required
              error={errors.link}
              input={
                <input
                  ref={firstFieldRef}
                  type="url"
                  value={form.link}
                  onChange={(e) => update('link', e.target.value)}
                  placeholder="https://..."
                  disabled={step === 'scoring'}
                />
              }
            />
            <Row>
              <Field
                label="Role Title"
                required
                error={errors.title}
                input={
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="Lead Product Designer"
                    disabled={step === 'scoring'}
                  />
                }
              />
              <Field
                label="Company"
                required
                error={errors.company}
                input={
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => update('company', e.target.value)}
                    placeholder="Acme Inc."
                    disabled={step === 'scoring'}
                  />
                }
              />
            </Row>
            <Field
              label="Company URL"
              input={
                <input
                  type="url"
                  value={form.companyUrl}
                  onChange={(e) => update('companyUrl', e.target.value)}
                  placeholder="https://..."
                  disabled={step === 'scoring'}
                />
              }
            />
            <Row>
              <Field
                label="Location"
                required
                error={errors.location}
                input={
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="Austin, TX"
                    disabled={step === 'scoring'}
                  />
                }
              />
              <Field
                label="Remote?"
                input={
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.remote}
                      onChange={(e) => update('remote', e.target.checked)}
                      disabled={step === 'scoring'}
                    />
                    <span>Remote-friendly</span>
                  </label>
                }
              />
            </Row>
            <Row>
              <Field
                label="Salary Range"
                input={
                  <input
                    type="text"
                    value={form.salary}
                    onChange={(e) => update('salary', e.target.value)}
                    placeholder="$180k-$240k"
                    disabled={step === 'scoring'}
                  />
                }
              />
              <Field
                label="Salary Min (USD)"
                error={errors.salaryMin}
                input={
                  <input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => update('salaryMin', e.target.value)}
                    placeholder="180000"
                    disabled={step === 'scoring'}
                  />
                }
              />
            </Row>
            <Row>
              <Field
                label="Stage"
                input={
                  <select value={form.stage} onChange={(e) => update('stage', e.target.value)} disabled={step === 'scoring'}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                }
              />
              <Field
                label="Source"
                input={
                  <select value={form.source} onChange={(e) => update('source', e.target.value)} disabled={step === 'scoring'}>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                }
              />
            </Row>
            <Field
              label="Industry (comma-separated)"
              input={
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  placeholder="Marketplace, Small Business"
                  disabled={step === 'scoring'}
                />
              }
            />
            <Field
              label="Job Description"
              required
              error={errors.jobDescription}
              input={
                <textarea
                  rows={8}
                  value={form.jobDescription}
                  onChange={(e) => update('jobDescription', e.target.value)}
                  placeholder="Paste the full job posting text here."
                  disabled={step === 'scoring'}
                />
              }
            />

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={step === 'scoring'}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={step === 'scoring'}>
                {step === 'scoring' ? (
                  <>
                    <Loader2 className="btn-icon spin" />
                    Analyzing job fit…
                  </>
                ) : (
                  <>
                    <Sparkles className="btn-icon" />
                    Analyze & Add
                  </>
                )}
              </button>
            </div>
            {step === 'scoring' && (
              <p className="modal-hint">Analyzing the posting against JOB_SEARCH_SKILL.md — usually 3–5 seconds.</p>
            )}
          </form>
        )}

        {(step === 'preview' || step === 'saving') && score && (
          <div className="modal-body">
            <div className="score-card">
              <div className="score-header">
                <div className={`score-num score-${tierClass(score.fitTier)}`}>{score.fitScore}</div>
                <div className="score-meta">
                  <div className="score-tier">{score.fitTier} fit</div>
                  <div className="score-role">{form.title} — {form.company}</div>
                </div>
              </div>
              <div className="score-criteria">
                <Criterion ok={score.criteriaMatches?.northStarMatch} label="North Star: real-world impact" />
                <Criterion ok={score.criteriaMatches?.salaryOnTarget} label="Salary on target" />
                <Criterion ok={score.criteriaMatches?.targetLocation} label="Target location" />
              </div>
              <div className="score-reasoning">
                <h4>Why this fits</h4>
                <p>{score.whyGoodFit || 'No explanation returned.'}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBackToForm}
                disabled={step === 'saving'}
              >
                <ArrowLeft className="btn-icon" />
                Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={step === 'saving'}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={step === 'saving'}
              >
                {step === 'saving' ? (
                  <>
                    <Loader2 className="btn-icon spin" />
                    Saving…
                  </>
                ) : (
                  'Save to Notion'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, error, input }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </span>
      {input}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function Row({ children }) {
  return <div className="field-row">{children}</div>;
}

function Criterion({ ok, label }) {
  return (
    <div className={`criterion ${ok ? 'criterion-ok' : 'criterion-off'}`}>
      <span className="criterion-dot" aria-hidden="true">{ok ? '●' : '○'}</span>
      <span>{label}</span>
    </div>
  );
}

function tierClass(tier) {
  switch (tier) {
    case 'Perfect': return 'perfect';
    case 'Strong': return 'strong';
    case 'Good': return 'good';
    default: return 'maybe';
  }
}

function inferSalaryMin(salary) {
  if (typeof salary !== 'string') return null;
  const match = salary.match(/\$?\s*(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'k') return Math.round(value * 1000);
  if (unit === 'm') return Math.round(value * 1_000_000);
  return Math.round(value);
}
