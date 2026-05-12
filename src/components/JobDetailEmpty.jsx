import React from 'react';

const JobDetailEmpty = ({ listIsEmpty, onClearFilters, onRefresh }) => {
  if (listIsEmpty) {
    return (
      <div className="detail-empty">
        <div className="detail-empty-icon">🔍</div>
        <p className="detail-empty-title">No jobs match your filters</p>
        <p className="detail-empty-text">
          Try clearing some filters or click Refresh Jobs to scan for new postings.
        </p>
        <div className="detail-empty-actions">
          <button className="btn btn-secondary" onClick={onClearFilters}>
            Clear filters
          </button>
          <button className="btn btn-primary" onClick={onRefresh}>
            Refresh Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-empty">
      <div className="detail-empty-icon">👈</div>
      <p className="detail-empty-title">Select a job to see details</p>
      <p className="detail-empty-text">
        Click any job in the list, or use ↑↓ arrow keys to navigate.
      </p>
    </div>
  );
};

export default JobDetailEmpty;
