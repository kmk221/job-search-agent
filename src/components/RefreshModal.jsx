import React, { useEffect } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';

export default function RefreshModal({ status, onCancel, onConfirm }) {
  const isScanning = status === 'scanning';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isScanning) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, isScanning]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) =>
        e.target === e.currentTarget && !isScanning && onCancel()
      }
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="refresh-title">
        <div className="modal-header">
          <h2 id="refresh-title">Scan for new jobs</h2>
          <button
            className="modal-close"
            onClick={onCancel}
            disabled={isScanning}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div className="modal-body">
          {isScanning ? (
            <div className="refresh-scanning">
              <Loader2 className="refresh-spinner" />
              <p className="refresh-scanning-text">Scanning company boards…</p>
              <p className="refresh-scanning-sub">
                Fetching listings from 125+ boards, then scoring any new roles
                with Haiku. Takes 30–60 seconds.
              </p>
            </div>
          ) : (
            <>
              <p className="refresh-desc">
                This scans ~125 company boards for design/product roles and
                scores any new ones we haven&apos;t seen before.
              </p>
              <div className="refresh-meta">
                <div className="refresh-meta-item">
                  <span className="refresh-meta-icon">⏱</span>
                  <span>Takes ~30–60 seconds</span>
                </div>
                <div className="refresh-meta-item">
                  <span className="refresh-meta-icon">💰</span>
                  <span>
                    Cost: ~$0.40 first time ever; ~$0.05 on subsequent
                    refreshes (only new jobs get scored)
                  </span>
                </div>
              </div>
              <p className="refresh-cache-note">
                Job scoring is cached for 30 days — only net-new roles you
                haven&apos;t seen before incur API cost.
              </p>
            </>
          )}
        </div>

        {!isScanning && (
          <div className="modal-footer" style={{ padding: '12px 24px 20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-add"
              onClick={onConfirm}
            >
              <RefreshCw className="btn-icon" />
              Start Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
