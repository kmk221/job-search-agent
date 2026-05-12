import React from 'react';
import {
  MapPin,
  DollarSign,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  PenLine,
} from 'lucide-react';
import { formatTimeAgo } from '../utils';

function getNorthStarBadgeColor(alignment) {
  switch (alignment) {
    case 'Perfect': return 'badge-perfect';
    case 'Strong': return 'badge-strong';
    case 'Moderate': return 'badge-moderate';
    default: return 'badge-default';
  }
}

const JobDetailPane = ({
  job,
  notionSync,
  savedLoading,
  userTargets,
  onSave,
  onRemove,
  onDraftOutreach,
  showKeyboardHints,
}) => {
  const entry = notionSync[job.id];
  const status = entry?.status;
  const pageUrl = entry?.pageUrl;
  const isSaving = status === 'saving';
  const isSaved = status === 'saved';
  const isRemoving = status === 'removing';
  const isError = status === 'error';
  const isTarget = userTargets.includes(job.id);

  return (
    <div className="detail-pane-content">
      {/* Title block */}
      <div className="detail-header">
        <div className="detail-title-block">
          <h2 className="detail-title">{job.title}</h2>
          <p className="detail-company">{job.company}</p>
          {job.source && job.source !== 'Manual entry' && (
            <p className="job-source-label">From: {job.source}</p>
          )}
        </div>
        <div className="detail-badges">
          <div
            className={`badge fit-badge ${job.fitScore >= 85 ? 'badge-high' : 'badge-mid'}`}
          >
            {job.fitScore}% Fit
          </div>
          <div className={`badge ${getNorthStarBadgeColor(job.northStarAlignment)}`}>
            <Sparkles className="badge-icon" />
            {job.northStarAlignment}
          </div>
          {job.source === 'Manual entry' && (
            <div className="badge badge-manual" title="Manually added">
              <PenLine className="badge-icon" />
              Manual
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="job-meta detail-meta">
        <div className="meta-item">
          <MapPin className="meta-icon" />
          {job.location}
        </div>
        {job.salary && (
          <div className="meta-item">
            <DollarSign className="meta-icon" />
            {job.salary}
          </div>
        )}
        {job.stage && <div className="meta-badge">{job.stage}</div>}
        {job.industry && <div className="meta-badge">{job.industry}</div>}
      </div>

      {/* Criteria */}
      <div className="criteria detail-criteria">
        {job.criteria.northStar ? (
          <div className="criteria-item criteria-check">
            <CheckCircle2 className="criteria-icon" />
            <span>North Star: Real-world impact ✓</span>
          </div>
        ) : (
          <div className="criteria-item criteria-x">
            <XCircle className="criteria-icon" />
            <span>Limited real-world impact</span>
          </div>
        )}
        {job.criteria.salary ? (
          <div className="criteria-item criteria-check">
            <CheckCircle2 className="criteria-icon" />
            <span>Salary on target</span>
          </div>
        ) : (
          <div className="criteria-item criteria-x">
            <XCircle className="criteria-icon" />
            <span>Salary unknown/below target</span>
          </div>
        )}
        {job.criteria.location ? (
          <div className="criteria-item criteria-check">
            <CheckCircle2 className="criteria-icon" />
            <span>Target location</span>
          </div>
        ) : (
          <div className="criteria-item criteria-x">
            <XCircle className="criteria-icon" />
            <span>Non-target location</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={`detail-actions ${savedLoading ? 'action-area--syncing' : ''}`}
        aria-busy={savedLoading}
      >
        {isSaved ? (
          <>
            {pageUrl ? (
              <a
                className="btn btn-saved"
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                ✅ Saved — View in Notion ↗
              </a>
            ) : (
              <span className="btn btn-saved">✅ Saved to Notion</span>
            )}
            <button
              className="btn btn-outreach"
              onClick={() => onDraftOutreach(job)}
              title="Draft outreach message"
            >
              📧 Draft Outreach
            </button>
            <button
              className="btn btn-undo"
              onClick={(e) => onRemove(job, e)}
              title="Remove from Notion"
            >
              Undo
            </button>
          </>
        ) : isRemoving ? (
          <button className="btn" disabled>Removing...</button>
        ) : (
          (() => {
            const btnClass = `btn ${
              isSaving ? 'btn-saving' : isError ? 'btn-error' : isTarget ? 'btn-active' : ''
            }`.trim();
            const label = isSaving
              ? 'Saving...'
              : isError
              ? '❌ Failed - try again'
              : isTarget
              ? '✓ Interested'
              : 'Save';
            return (
              <button
                className={btnClass}
                disabled={isSaving || savedLoading}
                title={isError ? entry?.message : undefined}
                onClick={(e) => onSave(job, e)}
              >
                {label}
              </button>
            );
          })()
        )}
      </div>

      <hr className="detail-divider" />

      {/* Fit reasoning */}
      {job.fitReasoning && (
        <div className="section">
          <h4 className="section-title">Your Fit (Against JOB_SEARCH_SKILL.md)</h4>
          <p className="section-text">{job.fitReasoning}</p>
        </div>
      )}

      {/* Core strengths */}
      {job.coreStrengths && job.coreStrengths.length > 0 && (
        <div className="section">
          <h4 className="section-title">Core Strengths Applied</h4>
          <div className="strengths">
            {job.coreStrengths.map((strength, idx) => (
              <span key={idx} className="strength-tag">{strength}</span>
            ))}
          </div>
        </div>
      )}

      {/* Key details */}
      <div className="section">
        <h4 className="section-title">Key Details</h4>
        <div className="details-grid">
          {job.funding && (
            <div><span className="detail-label">Funding:</span> {job.funding}</div>
          )}
          {job.stage && (
            <div><span className="detail-label">Stage:</span> {job.stage}</div>
          )}
          <div>
            <span className="detail-label">North Star:</span> {job.northStarAlignment}
          </div>
          {job.fetchedAt && (
            <div>
              <span className="detail-label">Fetched:</span> {formatTimeAgo(job.fetchedAt)}
            </div>
          )}
        </div>
      </div>

      {/* External link */}
      {job.link && (
        <div className="section">
          <a href={job.link} target="_blank" rel="noopener noreferrer" className="link">
            View Job Description
            <ExternalLink className="link-icon" />
          </a>
        </div>
      )}

      {/* Keyboard hints */}
      {showKeyboardHints && (
        <div className="keyboard-hints">
          ↑↓ to navigate · Enter to save · Esc to clear
        </div>
      )}
    </div>
  );
};

export default JobDetailPane;
