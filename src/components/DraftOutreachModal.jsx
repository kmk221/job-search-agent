import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, AlertCircle, Copy, Check } from 'lucide-react';

const WARMTH_OPTIONS = [
  { value: 'Cold', label: '🧊 Cold', description: 'never met' },
  { value: 'Warm-cold', label: '🌤 Warm-cold', description: 'mutual connection' },
  { value: 'Warm', label: '☀️ Warm', description: 'know but not close' },
  { value: 'Close', label: '🔥 Close', description: 'old friend / strong relationship' },
  { value: 'Peer', label: '👥 Peer', description: 'texting energy' },
];

const CHANNEL_OPTIONS = [
  'LinkedIn Connection Request',
  'LinkedIn DM / InMail',
  'Email',
  'Text Message',
];

const initialForm = {
  contactName: '',
  contactRole: '',
  linkedinUrl: '',
  warmth: '',
  channel: '',
  contextNotes: '',
};

export default function DraftOutreachModal({ job, onClose }) {
  const [step, setStep] = useState('form'); // form | loading | results
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [variants, setVariants] = useState([]);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (firstFieldRef.current) firstFieldRef.current.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && step !== 'loading') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const next = {};
    if (!form.contactName.trim()) next.contactName = 'Required';
    if (!form.warmth) next.warmth = 'Please select a warmth level';
    if (!form.channel) next.channel = 'Please select a channel';
    if (!form.contextNotes.trim()) next.contextNotes = 'Required — more context = better drafts';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError(null);
    setStep('loading');

    try {
      const res = await fetch('/api/draft-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: {
            roleTitle: job.title,
            company: job.company,
            whyGoodFit: job.fitReasoning,
            northStarMatch: job.criteria?.northStar,
            jobUrl: job.link,
          },
          contact: {
            name: form.contactName.trim(),
            role: form.contactRole.trim() || undefined,
            linkedinUrl: form.linkedinUrl.trim() || undefined,
            warmth: form.warmth,
            contextNotes: form.contextNotes.trim(),
          },
          channel: form.channel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Draft generation failed (${res.status})`);
      }
      setVariants(data.variants || []);
      setStep('results');
    } catch (err) {
      setApiError(err.message || 'Failed to generate drafts.');
      setStep('form');
    }
  };

  const handleBack = () => {
    setApiError(null);
    setStep('form');
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && step !== 'loading' && onClose()}
    >
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="outreach-title">
        <div className="modal-header">
          <h2 id="outreach-title">
            {step === 'results'
              ? `Drafts — ${job.title} at ${job.company}`
              : `Draft Outreach — ${job.title} at ${job.company}`}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={step === 'loading'}
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

        {(step === 'form' || step === 'loading') && (
          <form className="modal-body" onSubmit={handleGenerate}>
            <div className="field-row">
              <OutreachField label="Contact Name" required error={errors.contactName}>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                  placeholder="Alex Johnson"
                  disabled={step === 'loading'}
                />
              </OutreachField>
              <OutreachField label="Their Role / Title" error={errors.contactRole}>
                <input
                  type="text"
                  value={form.contactRole}
                  onChange={(e) => update('contactRole', e.target.value)}
                  placeholder="e.g. Director of Design"
                  disabled={step === 'loading'}
                />
              </OutreachField>
            </div>

            <OutreachField label="LinkedIn URL" error={errors.linkedinUrl}>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => update('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                disabled={step === 'loading'}
              />
            </OutreachField>

            <OutreachField label="Connection Warmth" required error={errors.warmth}>
              <div className="radio-group">
                {WARMTH_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`radio-option ${form.warmth === opt.value ? 'radio-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="warmth"
                      value={opt.value}
                      checked={form.warmth === opt.value}
                      onChange={() => update('warmth', opt.value)}
                      disabled={step === 'loading'}
                    />
                    <span className="radio-label">{opt.label}</span>
                    <span className="radio-desc">{opt.description}</span>
                  </label>
                ))}
              </div>
            </OutreachField>

            <OutreachField label="Channel" required error={errors.channel}>
              <div className="radio-group radio-group--channel">
                {CHANNEL_OPTIONS.map((ch) => (
                  <label
                    key={ch}
                    className={`radio-option ${form.channel === ch ? 'radio-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={ch}
                      checked={form.channel === ch}
                      onChange={() => update('channel', ch)}
                      disabled={step === 'loading'}
                    />
                    <span className="radio-label">{ch}</span>
                  </label>
                ))}
              </div>
            </OutreachField>

            <OutreachField
              label="How You Know Them / Context"
              required
              error={errors.contextNotes}
              hint="More context = better drafts. Include shared connections, recent posts/work that resonated, your history, anything personal."
            >
              <textarea
                rows={5}
                value={form.contextNotes}
                onChange={(e) => update('contextNotes', e.target.value)}
                placeholder="Example: Met at Config conference last year, she gave a great talk on AI in design tools. We've exchanged a few comments on her LinkedIn posts since. Mutual connection through Mia."
                disabled={step === 'loading'}
              />
            </OutreachField>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={step === 'loading'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={step === 'loading'}
              >
                {step === 'loading' ? (
                  <span className="loading-dots">
                    <span className="loading-dots__text">Drafting in your voice</span>
                    <span className="loading-dots__dot" />
                    <span className="loading-dots__dot" />
                    <span className="loading-dots__dot" />
                  </span>
                ) : (
                  '✉️ Generate Drafts'
                )}
              </button>
            </div>
            {step === 'loading' && (
              <p className="modal-hint">Generating 3 variants — usually 8–15 seconds.</p>
            )}
          </form>
        )}

        {step === 'results' && (
          <div className="modal-body">
            <div className="variants-list">
              {variants.map((v) => (
                <VariantCard key={v.type} variant={v} channel={form.channel} />
              ))}
            </div>

            <div className="outreach-tip">
              💡 Always edit before sending. These are starting points — make them yours.
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                <ArrowLeft className="btn-icon" />
                Back to form
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VariantCard({ variant, channel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(variant.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = variant.message;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="variant-card">
      <div className="variant-header">
        <div>
          <div className="variant-label">{variant.label}</div>
          <div className="variant-desc">{variant.description}</div>
        </div>
        <button
          type="button"
          className={`btn btn-copy ${copied ? 'btn-copy--copied' : ''}`}
          onClick={handleCopy}
          aria-label="Copy message"
        >
          {copied ? (
            <>
              <Check className="btn-icon" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="btn-icon" />
              Copy
            </>
          )}
        </button>
      </div>

      {variant.subject && channel === 'Email' && (
        <div className="variant-subject">
          <span className="variant-subject-label">Subject:</span> {variant.subject}
        </div>
      )}

      <div className="variant-message">{variant.message}</div>

      <div className="variant-footer">
        <span className="variant-chars">{variant.characterCount ?? variant.message?.length ?? 0} chars</span>
        {variant.channelFit && (
          <span className="variant-fit">{variant.channelFit}</span>
        )}
      </div>
    </div>
  );
}

function OutreachField({ label, required, error, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
