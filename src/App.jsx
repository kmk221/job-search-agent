import React, { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, CheckCircle2, XCircle, ExternalLink, Sparkles } from 'lucide-react';
import './App.css';
import { useSavedJobs } from './hooks/useSavedJobs';

const App = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [expandedJob, setExpandedJob] = useState(null);
  const [userTargets, setUserTargets] = useState([]);
  const [notionSync, setNotionSync] = useState({});

  const {
    loading: savedLoading,
    isJobSaved,
    updateLocalState,
  } = useSavedJobs();

  // Mock data evaluated against Kristin's JOB_SEARCH_SKILL.md
  // North Star Principle: Use tech to enable tangible, real-world human impact
  const mockJobs = [
    {
      id: 1,
      company: 'Faire',
      title: 'Lead Product Designer - Marketplace',
      location: 'Remote (SF-based)',
      salary: '$190k-$240k',
      stage: 'Series D',
      industry: 'Marketplace / Small Business',
      funding: '$500M+',
      link: 'https://job-boards.greenhouse.io/faire?departments[]=Design',
      fitScore: 98,
      northStarAlignment: 'Perfect',
      coreStrengths: ['Rules Engine - Discovery/Influence', 'Order Management - Constraint-Aware', 'Positions - Systems Scaling'],
      fitReasoning: 'This is your archetype role. Faire uses tech to enable tangible real-world impact—connecting small retailers and brands so they can thrive. Your Order Management "knowing when not to build" expertise directly applies to marketplace complexity. Rules Engine cross-functional discovery maps to their go-to-market. Your culture values (human-centered, mission-driven, collaborative) are foundational to Faire. Path to Principal is clear. This hits all five "sweet spot" categories.',
      criteria: {
        salary: true,
        stage: true,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 2,
      company: 'Ramp',
      title: 'Lead Product Designer - Financial Controls',
      location: 'Austin, TX',
      salary: '$190k-$230k',
      stage: 'Series D',
      industry: 'FinTech / Spend Management',
      funding: '$750M+',
      link: 'https://jobs.ashbyhq.com/ramp?departmentId=design',
      fitScore: 89,
      northStarAlignment: 'Strong',
      coreStrengths: ['Rules Engine - Discovery/Influence', 'Positions - Systems Scaling'],
      fitReasoning: 'Ramp helps teams work smarter by automating expense workflows—tangible real-world impact (faster approvals, better visibility, less busywork). Your Rules Engine discovery work maps directly to their compliance/policy challenges. Your Positions measurement thinking applies to multi-stakeholder workflows. Austin location is perfect. Strong culture reputation. One trade-off: pure fintech focus (vs. fintech-enabling-something-else like Faire).',
      criteria: {
        salary: true,
        stage: true,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 3,
      company: 'Plaid',
      title: 'Lead Product Designer - Financial Infrastructure',
      location: 'Remote',
      salary: '$185k-$225k',
      stage: 'Series E',
      industry: 'FinTech / Infrastructure',
      funding: '$300M+',
      link: 'https://plaid.com/careers/openings/?team=design',
      fitScore: 86,
      northStarAlignment: 'Strong',
      coreStrengths: ['Rules Engine - Discovery/Influence', 'Order Management - Constraint-Aware'],
      fitReasoning: 'Plaid is infrastructure enabling creators/entrepreneurs to get paid and manage finances—tangible impact. Your fintech domain expertise and ability to design for complex, multi-stakeholder ecosystems is core. Order Management constraint-awareness applies to API design challenges. Remote works. Culture is collaborative and mission-driven. Trade-off: Less direct real-world impact than Faire (more B2B infrastructure).',
      criteria: {
        salary: true,
        stage: true,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 4,
      company: 'Shopify',
      title: 'Senior Product Designer - Merchant Tools',
      location: 'Remote',
      salary: '$185k-$230k',
      stage: 'Public',
      industry: 'E-Commerce / Creator Platform',
      funding: 'Public',
      link: 'https://www.shopify.com/careers/search?keywords=designer',
      fitScore: 87,
      northStarAlignment: 'Strong',
      coreStrengths: ['Positions - Systems Scaling', 'Rules Engine - Discovery/Influence'],
      fitReasoning: 'Shopify enables small business owners and creators to build thriving online businesses—direct tangible real-world impact. Your Positions platform scaling expertise applies to their massive merchant ecosystem. Rules Engine discovery work maps to understanding merchant pain points. Strong design culture and collaborative team. Path to Principal clear.',
      criteria: {
        salary: true,
        stage: false,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 5,
      company: 'Webflow',
      title: 'Lead Product Designer - Creator Tools',
      location: 'Remote',
      salary: '$180k-$220k',
      stage: 'Series D',
      industry: 'Creator Platform / No-Code',
      funding: '$150M+',
      link: 'https://webflow.com/careers#open-positions',
      fitScore: 85,
      northStarAlignment: 'Strong',
      coreStrengths: ['Positions - Systems Scaling', 'Order Management - Constraint-Aware'],
      fitReasoning: 'Webflow enables designers and creators to build beautiful, functional web experiences without coding—direct real-world impact (empowering people). Your design systems expertise is foundational to their platform. Order Management "knowing when to simplify" applies to their constraint-aware design philosophy. Growing design org, collaborative culture, mission-driven.',
      criteria: {
        salary: true,
        stage: true,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 6,
      company: 'Curative',
      title: 'Principal Product Designer',
      location: 'Austin, TX',
      salary: '$185k-$225k',
      stage: 'Series B',
      industry: 'HealthTech / Insurance',
      funding: '$150M',
      link: 'https://curative.com/careers',
      fitScore: 83,
      northStarAlignment: 'Strong',
      coreStrengths: ['Rules Engine - Discovery/Influence', 'Order Management - Constraint-Aware'],
      fitReasoning: 'Curative simplifies health insurance for millions—real human impact (people getting healthcare access). Your regulatory UX expertise (FINRA/SEC) translates directly to healthcare compliance. Your Order Management constraint-aware thinking applies to insurance product complexity. Growing design org with leadership opportunity. Austin location perfect.',
      criteria: {
        salary: true,
        stage: true,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 7,
      company: 'Guild Education',
      title: 'Senior Product Designer - Learning & Skills',
      location: 'Denver, CO',
      salary: '$170k-$210k',
      stage: 'Series E+',
      industry: 'EdTech / Career Development',
      funding: '$175M Series E',
      link: 'https://job-boards.greenhouse.io/guild?departments[]=Design',
      fitScore: 81,
      northStarAlignment: 'Moderate',
      coreStrengths: ['Positions - Systems Scaling'],
      fitReasoning: 'Guild helps workers access education and advance careers—meaningful real-world impact. Your data systems expertise applies. Denver location is ideal. Strong equity story. Trade-offs: Salary below target, less design-forward culture than Faire, industry less aligned with your deep expertise.',
      criteria: {
        salary: false,
        stage: true,
        location: true,
        industry: false,
        designFit: true,
        northStar: true
      }
    },
    {
      id: 8,
      company: 'Stripe',
      title: 'Staff Product Designer - Payments',
      location: 'Remote',
      salary: '$200k-$250k',
      stage: 'Unicorn',
      industry: 'FinTech / Payments',
      funding: 'Private ($95B valuation)',
      link: 'https://stripe.com/jobs/search?teams=Design',
      fitScore: 84,
      northStarAlignment: 'Strong',
      coreStrengths: ['Positions - Systems Scaling', 'Rules Engine - Discovery/Influence'],
      fitReasoning: 'Stripe enables creators and entrepreneurs to get paid—tangible, real-world impact. Your fintech expertise is strong fit. Design systems thinking applies at their scale. Compensation is excellent. Trade-offs: Very large org (less direct influence than smaller team), less compliance-focused than your background.',
      criteria: {
        salary: true,
        stage: true,
        location: true,
        industry: true,
        designFit: true,
        northStar: true
      }
    }
  ];

  useEffect(() => {
    setJobs(mockJobs);
    setFilteredJobs(mockJobs);
  }, []);

  useEffect(() => {
    if (savedLoading || jobs.length === 0) return;

    const matches = [];
    jobs.forEach((job) => {
      const match = isJobSaved(job.company, job.title);
      if (match) matches.push({ jobId: job.id, match });
    });
    if (matches.length === 0) return;

    setNotionSync((prev) => {
      const next = { ...prev };
      matches.forEach(({ jobId, match }) => {
        if (next[jobId]?.status !== 'saved' || next[jobId]?.pageId !== match.pageId) {
          next[jobId] = {
            status: 'saved',
            pageId: match.pageId,
            pageUrl: match.pageUrl,
          };
        }
      });
      return next;
    });
    setUserTargets((prev) => {
      const set = new Set(prev);
      matches.forEach(({ jobId }) => set.add(jobId));
      return Array.from(set);
    });
  }, [savedLoading, jobs, isJobSaved]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterJobs(query, selectedLocation, selectedStage);
  };

  const handleLocationFilter = (location) => {
    setSelectedLocation(location);
    filterJobs(searchQuery, location, selectedStage);
  };

  const handleStageFilter = (stage) => {
    setSelectedStage(stage);
    filterJobs(searchQuery, selectedLocation, stage);
  };

  const filterJobs = (query, location, stage) => {
    let filtered = jobs;

    if (query) {
      filtered = filtered.filter(job =>
        job.company.toLowerCase().includes(query.toLowerCase()) ||
        job.title.toLowerCase().includes(query.toLowerCase()) ||
        job.industry.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (location !== 'all') {
      filtered = filtered.filter(job =>
        job.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (stage !== 'all') {
      filtered = filtered.filter(job => job.stage === stage);
    }

    setFilteredJobs(filtered);
  };

  const getCriteriaStatus = (job) => {
    const matchCount = Object.values(job.criteria).filter(Boolean).length;
    const totalCount = Object.keys(job.criteria).length;
    return `${matchCount}/${totalCount}`;
  };

  const toggleTarget = (jobId) => {
    setUserTargets(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const saveToNotion = async (job, e) => {
    if (e) e.stopPropagation();
    const current = notionSync[job.id]?.status;
    if (current === 'saving' || current === 'saved') return;

    setNotionSync(prev => ({ ...prev, [job.id]: { status: 'saving' } }));
    if (!userTargets.includes(job.id)) {
      setUserTargets(prev => [...prev, job.id]);
    }

    try {
      const res = await fetch('/api/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          stage: job.stage,
          industry: job.industry,
          link: job.link,
          fitScore: job.fitScore,
          fitReasoning: job.fitReasoning,
          criteria: job.criteria,
          northStarAlignment: job.northStarAlignment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setNotionSync(prev => ({
        ...prev,
        [job.id]: {
          status: 'saved',
          pageId: data.pageId,
          pageUrl: data.pageUrl,
        },
      }));
      updateLocalState({
        type: 'add',
        entry: {
          pageId: data.pageId,
          pageUrl: data.pageUrl,
          roleTitle: job.title,
          company: job.company,
          status: 'Interested',
        },
      });
    } catch (err) {
      setNotionSync(prev => ({
        ...prev,
        [job.id]: { status: 'error', message: err.message },
      }));
    }
  };

  const removeFromNotion = async (job, e) => {
    if (e) e.stopPropagation();
    const entry = notionSync[job.id];
    if (!entry || !entry.pageId || entry.status === 'removing') return;
    const { pageId } = entry;

    setNotionSync(prev => ({
      ...prev,
      [job.id]: { ...prev[job.id], status: 'removing' },
    }));

    try {
      const res = await fetch('/api/remove-from-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setNotionSync(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      updateLocalState({ type: 'remove', pageId });
    } catch (err) {
      setNotionSync(prev => ({
        ...prev,
        [job.id]: {
          ...prev[job.id],
          status: 'error',
          message: err.message,
        },
      }));
    }
  };

  const getNorthStarBadgeColor = (alignment) => {
    switch (alignment) {
      case 'Perfect':
        return 'badge-perfect';
      case 'Strong':
        return 'badge-strong';
      case 'Moderate':
        return 'badge-moderate';
      default:
        return 'badge-default';
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Job Scout Agent — Phase 2</h1>
        <p className="subtitle">Real job search evaluated against your JOB_SEARCH_SKILL.md + North Star Principle</p>
        <p className="subtitle-blue">✨ Now references your core strengths, culture values, and North Star (tech enabling tangible real-world impact)</p>
      </div>

      <div className="filters">
        <div className="filter-grid">
          <div>
            <label className="filter-label">Search</label>
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search companies, roles, industries..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div>
            <label className="filter-label">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => handleLocationFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Locations</option>
              <option value="Remote">Remote</option>
              <option value="Austin">Austin</option>
              <option value="Denver">Denver</option>
              <option value="Portland">Portland</option>
            </select>
          </div>

          <div>
            <label className="filter-label">Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => handleStageFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Stages</option>
              <option value="Series B">Series B</option>
              <option value="Series D">Series D</option>
              <option value="Series E+">Series E+</option>
              <option value="Public">Public</option>
            </select>
          </div>
        </div>

        <div className="job-count">{filteredJobs.length} jobs match your criteria</div>
      </div>

      <div className="jobs-list">
        {filteredJobs.length === 0 ? (
          <div className="empty">
            <p>No jobs match your filters. Try adjusting your search.</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div
              key={job.id}
              className={`job-card ${expandedJob === job.id ? 'expanded' : ''}`}
              onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
            >
              <div className="job-header">
                <div className="job-top">
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <p className="job-company">{job.company}</p>
                  </div>
                  <div className="badges">
                    <div className={`badge fit-badge ${job.fitScore >= 85 ? 'badge-high' : 'badge-mid'}`}>
                      {job.fitScore}% Fit
                    </div>
                    <div className={`badge ${getNorthStarBadgeColor(job.northStarAlignment)}`}>
                      <Sparkles className="badge-icon" />
                      {job.northStarAlignment}
                    </div>
                    <div
                      className={`action-area ${savedLoading ? 'action-area--syncing' : ''}`}
                      aria-busy={savedLoading}
                    >
                      {(() => {
                      const entry = notionSync[job.id];
                      const status = entry?.status;
                      const pageUrl = entry?.pageUrl;
                      const isSaving = status === 'saving';
                      const isSaved = status === 'saved';
                      const isRemoving = status === 'removing';
                      const isError = status === 'error';
                      const isTarget = userTargets.includes(job.id);

                      if (isSaved) {
                        return (
                          <>
                            {pageUrl ? (
                              <a
                                className="btn btn-saved"
                                href={pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                ✅ Saved — View in Notion ↗
                              </a>
                            ) : (
                              <span className="btn btn-saved">✅ Saved to Notion</span>
                            )}
                            <button
                              className="btn btn-undo"
                              onClick={(e) => removeFromNotion(job, e)}
                              title="Remove from Notion"
                            >
                              Undo
                            </button>
                          </>
                        );
                      }

                      if (isRemoving) {
                        return (
                          <button className="btn" disabled>
                            Removing...
                          </button>
                        );
                      }

                      const className = `btn ${
                        isSaving ? 'btn-saving'
                        : isError ? 'btn-error'
                        : isTarget ? 'btn-active'
                        : ''
                      }`.trim();
                      const label = isSaving ? 'Saving...'
                        : isError ? '❌ Failed - try again'
                        : isTarget ? '✓ Interested'
                        : 'Save';
                      return (
                        <button
                          className={className}
                          disabled={isSaving || savedLoading}
                          title={isError ? entry?.message : undefined}
                          onClick={(e) => saveToNotion(job, e)}
                        >
                          {label}
                        </button>
                      );
                    })()}
                    </div>
                  </div>
                </div>

                <div className="job-meta">
                  <div className="meta-item">
                    <MapPin className="meta-icon" />
                    {job.location}
                  </div>
                  <div className="meta-item">
                    <DollarSign className="meta-icon" />
                    {job.salary}
                  </div>
                  <div className="meta-badge">{job.stage}</div>
                  <div className="meta-badge">{job.industry}</div>
                </div>
              </div>

              <div className="criteria">
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
                    <span>Salary below target</span>
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
                <span className="criteria-count">Criteria: {getCriteriaStatus(job)}</span>
              </div>

              {expandedJob === job.id && (
                <div className="job-expanded">
                  <div className="section">
                    <h4 className="section-title">Your Fit (Against JOB_SEARCH_SKILL.md)</h4>
                    <p className="section-text">{job.fitReasoning}</p>
                  </div>

                  <div className="section">
                    <h4 className="section-title">Core Strengths Applied</h4>
                    <div className="strengths">
                      {job.coreStrengths.map((strength, idx) => (
                        <span key={idx} className="strength-tag">{strength}</span>
                      ))}
                    </div>
                  </div>

                  <div className="section">
                    <h4 className="section-title">Key Details</h4>
                    <div className="details-grid">
                      <div>
                        <span className="detail-label">Funding:</span> {job.funding}
                      </div>
                      <div>
                        <span className="detail-label">Stage:</span> {job.stage}
                      </div>
                      <div>
                        <span className="detail-label">North Star Alignment:</span> {job.northStarAlignment}
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                    >
                      View Job Description
                      <ExternalLink className="link-icon" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {userTargets.length > 0 && (
        <div className="targets">
          <h3 className="targets-title">Your Targets ({userTargets.length})</h3>
          <div className="target-items">
            {filteredJobs
              .filter(job => userTargets.includes(job.id))
              .map(job => (
                <div key={job.id} className="target-badge">
                  <span>{job.company} - {job.title.split(' - ')[0]}</span>
                  <button
                    className="close-btn"
                    onClick={() => toggleTarget(job.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="info-box">
        <p>
          ✨ <strong>Phase 2 (Updated):</strong> This tool evaluates every job against your JOB_SEARCH_SKILL.md: North Star Principle (tech enabling real-world impact), your three core strengths (Rules Engine, Order Management, Positions), culture values, and practical criteria (salary, location, stage).
        </p>
        <p style={{ marginTop: '12px' }}>
          <strong>Next:</strong> Phase 3 adds Notion API + LinkedIn integration + autonomous weekly search.
        </p>
      </div>
    </div>
  );
};

export default App;
