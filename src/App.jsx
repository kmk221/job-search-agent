import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MapPin,
  DollarSign,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Plus,
  X,
  PenLine,
  RefreshCw,
  AlertCircle,
  Settings,
} from 'lucide-react';
import './App.css';
import { useSavedJobs } from './hooks/useSavedJobs';
import AddJobModal from './components/AddJobModal';
import DraftOutreachModal from './components/DraftOutreachModal';
import RefreshModal from './components/RefreshModal';

// --- Utilities ---

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function isNewJob(fetchedAt) {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < 24 * 60 * 60 * 1000;
}

function isStaleRefresh(scannedAt) {
  if (!scannedAt) return false;
  return Date.now() - new Date(scannedAt).getTime() > 24 * 60 * 60 * 1000;
}

function applyFilters(list, query, location, stage) {
  let filtered = list;
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (job) =>
        (job.company || '').toLowerCase().includes(q) ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.industry || '').toLowerCase().includes(q) ||
        (job.category || '').toLowerCase().includes(q)
    );
  }
  if (location !== 'all') {
    filtered = filtered.filter((job) =>
      (job.location || '').toLowerCase().includes(location.toLowerCase())
    );
  }
  if (stage !== 'all') {
    filtered = filtered.filter((job) => job.stage === stage);
  }
  return filtered;
}

function deriveAlignmentLabel(score, northStarMatch) {
  if (!northStarMatch) return 'Moderate';
  if (score >= 90) return 'Perfect';
  if (score >= 75) return 'Strong';
  return 'Moderate';
}

function savedJobToCardShape(entry) {
  const score = typeof entry.fitScore === 'number' ? entry.fitScore : 0;
  const northStarMatch = Boolean(entry.northStarMatch);
  const salaryOnTarget =
    typeof entry.salaryMin === 'number' ? entry.salaryMin >= 180000 : true;
  const targetLocation = /remote|austin|denver|portland/i.test(entry.location || '');
  return {
    id: `manual-${entry.pageId}`,
    pageId: entry.pageId,
    pageUrl: entry.pageUrl,
    company: entry.company || '',
    title: entry.roleTitle || '',
    location: entry.location || '',
    salary: entry.salary || '',
    stage: entry.stage || 'Unknown',
    industry: entry.industry || '',
    funding: '',
    link: entry.link || '',
    companyUrl: entry.companyUrl || '',
    fitScore: score,
    northStarAlignment: deriveAlignmentLabel(score, northStarMatch),
    coreStrengths: [],
    fitReasoning: entry.fitReasoning || '',
    source: entry.source || 'Manual entry',
    criteria: {
      salary: salaryOnTarget,
      stage: true,
      location: targetLocation,
      industry: true,
      designFit: true,
      northStar: northStarMatch,
    },
  };
}

function scrapedJobToCardShape(job) {
  const score = typeof job.fitScore === 'number' ? job.fitScore : 0;
  const northStarMatch = Boolean(job.northStarMatch);
  return {
    id: job.id,
    company: job.sourceCompany || '',
    title: job.roleTitle || '',
    location: job.location || '',
    salary: '',
    stage: '',
    industry: job.category || '',
    funding: '',
    link: job.jobUrl || '',
    companyUrl: '',
    fitScore: score,
    northStarAlignment: deriveAlignmentLabel(score, northStarMatch),
    coreStrengths: [],
    fitReasoning: '',
    fitTier: job.fitTier || null,
    source: `${job.sourceCompany} careers`,
    sourcePlatform: job.sourcePlatform,
    category: job.category || '',
    fetchedAt: job.fetchedAt || null,
    criteria: {
      salary: false,
      stage: true,
      location:
        Boolean(job.remote) ||
        /remote|austin|denver|portland/i.test(job.location || ''),
      industry: true,
      designFit: true,
      northStar: northStarMatch,
    },
  };
}

// --- Mock data (Phase 2 showcase; stays until scraped jobs populate) ---
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
    coreStrengths: [
      'Rules Engine - Discovery/Influence',
      'Order Management - Constraint-Aware',
      'Positions - Systems Scaling',
    ],
    fitReasoning:
      'This is your archetype role. Faire uses tech to enable tangible real-world impact—connecting small retailers and brands so they can thrive. Your Order Management "knowing when not to build" expertise directly applies to marketplace complexity. Rules Engine cross-functional discovery maps to their go-to-market. Your culture values (human-centered, mission-driven, collaborative) are foundational to Faire. Path to Principal is clear. This hits all five "sweet spot" categories.',
    criteria: { salary: true, stage: true, location: true, industry: true, designFit: true, northStar: true },
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
    fitReasoning:
      'Ramp helps teams work smarter by automating expense workflows—tangible real-world impact. Your Rules Engine discovery work maps directly to their compliance/policy challenges.',
    criteria: { salary: true, stage: true, location: true, industry: true, designFit: true, northStar: true },
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
    fitReasoning:
      'Plaid is infrastructure enabling creators/entrepreneurs to get paid and manage finances—tangible impact. Your fintech domain expertise and ability to design for complex, multi-stakeholder ecosystems is core.',
    criteria: { salary: true, stage: true, location: true, industry: true, designFit: true, northStar: true },
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
    fitReasoning:
      'Shopify enables small business owners and creators to build thriving online businesses—direct tangible real-world impact.',
    criteria: { salary: true, stage: false, location: true, industry: true, designFit: true, northStar: true },
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
    fitReasoning:
      'Webflow enables designers and creators to build beautiful, functional web experiences without coding—direct real-world impact.',
    criteria: { salary: true, stage: true, location: true, industry: true, designFit: true, northStar: true },
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
    fitReasoning:
      'Curative simplifies health insurance for millions—real human impact. Your regulatory UX expertise (FINRA/SEC) translates directly to healthcare compliance.',
    criteria: { salary: true, stage: true, location: true, industry: true, designFit: true, northStar: true },
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
    fitReasoning:
      'Guild helps workers access education and advance careers—meaningful real-world impact. Denver location is ideal.',
    criteria: { salary: false, stage: true, location: true, industry: false, designFit: true, northStar: true },
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
    fitReasoning:
      'Stripe enables creators and entrepreneurs to get paid—tangible, real-world impact. Your fintech expertise is strong fit.',
    criteria: { salary: true, stage: true, location: true, industry: true, designFit: true, northStar: true },
  },
];

// --- Main component ---

const App = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [expandedJob, setExpandedJob] = useState(null);
  const [userTargets, setUserTargets] = useState([]);
  const [notionSync, setNotionSync] = useState({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [outreachJob, setOutreachJob] = useState(null);
  const [toast, setToast] = useState(null);

  // Phase 3.5: scraped jobs + refresh state
  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null); // null | 'scanning'
  const [lastRefreshInfo, setLastRefreshInfo] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    savedJobs,
    loading: savedLoading,
    isJobSaved,
    updateLocalState,
    refetch: refetchSavedJobs,
  } = useSavedJobs();

  const manualJobs = useMemo(
    () =>
      savedJobs.filter((s) => s.source === 'Manual entry').map(savedJobToCardShape),
    [savedJobs]
  );

  // Hydrate scraped jobs + refresh info from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastRefreshResults');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.jobs)) {
        const cards = parsed.jobs
          .filter((j) => typeof j.fitScore === 'number' && j.fitScore >= 70)
          .map(scrapedJobToCardShape);
        setScrapedJobs(cards);
      }
      if (parsed.scannedAt) {
        setLastRefreshInfo({ scannedAt: parsed.scannedAt, ...parsed.stats });
      }
    } catch {
      // ignore malformed localStorage data
    }
  }, []);

  useEffect(() => {
    const combined = [...manualJobs, ...scrapedJobs, ...mockJobs];
    setJobs(combined);
    setFilteredJobs(applyFilters(combined, searchQuery, selectedLocation, selectedStage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualJobs, scrapedJobs]);

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
          next[jobId] = { status: 'saved', pageId: match.pageId, pageUrl: match.pageUrl };
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Refresh handlers ---

  const runRefresh = async (force = false) => {
    setRefreshStatus('scanning');
    try {
      const url = force ? '/api/fetch-jobs?force=true' : '/api/fetch-jobs';
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Scan failed (${res.status})`);

      const cards = (data.jobs || [])
        .filter((j) => typeof j.fitScore === 'number' && j.fitScore >= 70)
        .map(scrapedJobToCardShape);
      setScrapedJobs(cards);

      const refreshInfo = {
        scannedAt: data.scannedAt,
        totalCompaniesScanned: data.totalCompaniesScanned,
        cachedScores: data.cachedScores,
        freshScores: data.freshScores,
        designProductJobsAfterFilter: data.designProductJobsAfterFilter,
        cacheVersion: data.cacheVersion,
      };
      setLastRefreshInfo(refreshInfo);

      try {
        localStorage.setItem(
          'lastRefreshResults',
          JSON.stringify({ jobs: data.jobs, scannedAt: data.scannedAt, stats: refreshInfo })
        );
      } catch {
        // localStorage full or unavailable
      }

      setShowRefreshModal(false);
      setRefreshStatus(null);
      setToast({
        kind: 'success',
        text: `Found ${data.designProductJobsAfterFilter} design/product roles at ${data.successfulFetches} companies. ${data.freshScores} scored fresh, ${data.cachedScores} from cache.`,
      });
    } catch (err) {
      setRefreshStatus(null);
      setShowRefreshModal(false);
      setToast({ kind: 'error', text: `Scan failed: ${err.message}` });
    }
  };

  const handleRefreshStart = () => runRefresh(false);

  const handleForceRescore = async () => {
    const estimatedJobs = lastRefreshInfo?.designProductJobsAfterFilter || 50;
    const cost = (estimatedJobs * 0.001).toFixed(2);
    if (
      !window.confirm(
        `Force re-score will re-analyze ALL cached jobs with fresh AI scoring.\n\nEstimated cost: ~$${cost}\n\nContinue?`
      )
    )
      return;
    setShowAdvanced(false);
    runRefresh(true);
  };

  // --- Existing handlers ---

  const handleManualSaved = async ({ pageUrl, title, company }) => {
    setShowAddModal(false);
    setToast({ kind: 'success', text: `Saved "${title}" at ${company} to Notion.`, pageUrl });
    await refetchSavedJobs();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredJobs(applyFilters(jobs, query, selectedLocation, selectedStage));
  };

  const handleLocationFilter = (location) => {
    setSelectedLocation(location);
    setFilteredJobs(applyFilters(jobs, searchQuery, location, selectedStage));
  };

  const handleStageFilter = (stage) => {
    setSelectedStage(stage);
    setFilteredJobs(applyFilters(jobs, searchQuery, selectedLocation, stage));
  };

  const getCriteriaStatus = (job) => {
    const matchCount = Object.values(job.criteria).filter(Boolean).length;
    return `${matchCount}/${Object.keys(job.criteria).length}`;
  };

  const toggleTarget = (jobId) => {
    setUserTargets((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const saveToNotion = async (job, e) => {
    if (e) e.stopPropagation();
    const current = notionSync[job.id]?.status;
    if (current === 'saving' || current === 'saved') return;

    setNotionSync((prev) => ({ ...prev, [job.id]: { status: 'saving' } }));
    if (!userTargets.includes(job.id)) {
      setUserTargets((prev) => [...prev, job.id]);
    }

    try {
      const res = await fetch('/api/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: job.title,
          company: job.company,
          companyUrl: job.companyUrl,
          location: job.location,
          salary: job.salary,
          stage: job.stage,
          industry: job.industry || job.category,
          link: job.link,
          fitScore: job.fitScore,
          fitReasoning: job.fitReasoning,
          criteria: job.criteria,
          northStarMatch: job.criteria?.northStar,
          source: job.source || 'Job Scout',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setNotionSync((prev) => ({
        ...prev,
        [job.id]: { status: 'saved', pageId: data.pageId, pageUrl: data.pageUrl },
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
      setNotionSync((prev) => ({
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

    setNotionSync((prev) => ({
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
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setNotionSync((prev) => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      updateLocalState({ type: 'remove', pageId });
    } catch (err) {
      setNotionSync((prev) => ({
        ...prev,
        [job.id]: { ...prev[job.id], status: 'error', message: err.message },
      }));
    }
  };

  const getNorthStarBadgeColor = (alignment) => {
    switch (alignment) {
      case 'Perfect': return 'badge-perfect';
      case 'Strong': return 'badge-strong';
      case 'Moderate': return 'badge-moderate';
      default: return 'badge-default';
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Job Scout Agent</h1>
        <p className="subtitle">
          Evaluated against your JOB_SEARCH_SKILL.md + North Star Principle
        </p>
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

      {/* Last refresh stats bar */}
      {lastRefreshInfo && (
        <div className="last-refresh-bar">
          <span>
            Last refreshed: <strong>{formatTimeAgo(lastRefreshInfo.scannedAt)}</strong>
            {' | '}
            {lastRefreshInfo.cachedScores} cached + {lastRefreshInfo.freshScores} new ={' '}
            <strong>{lastRefreshInfo.designProductJobsAfterFilter}</strong> design/product roles
            (showing 70%+ fit)
          </span>
          {isStaleRefresh(lastRefreshInfo.scannedAt) && (
            <button
              className="btn-link stale-nudge-btn"
              onClick={() => setShowRefreshModal(true)}
            >
              Refresh now?
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="jobs-toolbar">
        <div className="toolbar-left">
          <button
            type="button"
            className="btn btn-secondary btn-add"
            onClick={() => setShowRefreshModal(true)}
            disabled={refreshStatus === 'scanning'}
          >
            <RefreshCw className={`btn-icon${refreshStatus === 'scanning' ? ' spin' : ''}`} />
            {refreshStatus === 'scanning' ? 'Scanning…' : 'Refresh Jobs'}
          </button>
          <button
            type="button"
            className="btn-link advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            <Settings className="advanced-icon" />
            Advanced
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-add"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="btn-icon" />
          Add Job Manually
        </button>
      </div>

      {/* Advanced panel */}
      {showAdvanced && (
        <div className="advanced-panel">
          <div className="advanced-row">
            <span className="advanced-label">Cache version</span>
            <code className="advanced-value">{lastRefreshInfo?.cacheVersion || '—'}</code>
            <span className="advanced-hint">
              SHA-256 of JOB_SEARCH_SKILL.md (first 8 chars). Changes when you edit your skill
              profile, which invalidates all cached scores.
            </span>
          </div>
          <div className="advanced-row">
            <span className="advanced-label">Last refresh</span>
            <span className="advanced-value">
              {lastRefreshInfo?.scannedAt
                ? new Date(lastRefreshInfo.scannedAt).toLocaleString()
                : '—'}
            </span>
          </div>
          <div className="advanced-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleForceRescore}
              disabled={refreshStatus === 'scanning'}
            >
              Force re-score all cached jobs
            </button>
            <span className="advanced-hint">
              Bypasses cache — re-scores everything with fresh AI analysis. ~$0.001 per job.
            </span>
          </div>
        </div>
      )}

      <div className="jobs-list">
        {filteredJobs.length === 0 ? (
          <div className="empty">
            <p>No jobs match your filters. Try adjusting your search.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
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
                    {job.source && job.source !== 'Manual entry' && (
                      <p className="job-source-label">From: {job.source}</p>
                    )}
                  </div>
                  <div className="badges">
                    {isNewJob(job.fetchedAt) && (
                      <div className="badge badge-new">✨ NEW</div>
                    )}
                    {job.category && (
                      <div className="badge badge-category">{job.category}</div>
                    )}
                    <div
                      className={`badge fit-badge ${
                        job.fitScore >= 85 ? 'badge-high' : 'badge-mid'
                      }`}
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
                                className="btn btn-outreach"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOutreachJob(job);
                                }}
                                title="Draft outreach message"
                              >
                                📧 Draft Outreach
                              </button>
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
                          return <button className="btn" disabled>Removing...</button>;
                        }
                        const btnClass = `btn ${
                          isSaving
                            ? 'btn-saving'
                            : isError
                            ? 'btn-error'
                            : isTarget
                            ? 'btn-active'
                            : ''
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
                  {job.salary && (
                    <div className="meta-item">
                      <DollarSign className="meta-icon" />
                      {job.salary}
                    </div>
                  )}
                  {job.stage && <div className="meta-badge">{job.stage}</div>}
                  {job.industry && <div className="meta-badge">{job.industry}</div>}
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
                <span className="criteria-count">Criteria: {getCriteriaStatus(job)}</span>
              </div>

              {expandedJob === job.id && (
                <div className="job-expanded">
                  {job.fitReasoning && (
                    <div className="section">
                      <h4 className="section-title">Your Fit (Against JOB_SEARCH_SKILL.md)</h4>
                      <p className="section-text">{job.fitReasoning}</p>
                    </div>
                  )}
                  {job.coreStrengths && job.coreStrengths.length > 0 && (
                    <div className="section">
                      <h4 className="section-title">Core Strengths Applied</h4>
                      <div className="strengths">
                        {job.coreStrengths.map((strength, idx) => (
                          <span key={idx} className="strength-tag">
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="section">
                    <h4 className="section-title">Key Details</h4>
                    <div className="details-grid">
                      {job.funding && (
                        <div>
                          <span className="detail-label">Funding:</span> {job.funding}
                        </div>
                      )}
                      {job.stage && (
                        <div>
                          <span className="detail-label">Stage:</span> {job.stage}
                        </div>
                      )}
                      <div>
                        <span className="detail-label">North Star Alignment:</span>{' '}
                        {job.northStarAlignment}
                      </div>
                      {job.fetchedAt && (
                        <div>
                          <span className="detail-label">Fetched:</span>{' '}
                          {formatTimeAgo(job.fetchedAt)}
                        </div>
                      )}
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
              .filter((job) => userTargets.includes(job.id))
              .map((job) => (
                <div key={job.id} className="target-badge">
                  <span>
                    {job.company} - {job.title.split(' - ')[0]}
                  </span>
                  <button className="close-btn" onClick={() => toggleTarget(job.id)}>
                    ×
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="info-box">
        <p>
          <strong>Phase 3.5:</strong> Click &ldquo;Refresh Jobs&rdquo; to scan 125+ company
          boards for design/product roles. New roles are scored with Claude Haiku (~$0.001
          each); previously-seen roles load instantly from cache. Only roles scoring 70%+ fit
          are shown from scraped results.
        </p>
      </div>

      {showAddModal && (
        <AddJobModal onClose={() => setShowAddModal(false)} onSaved={handleManualSaved} />
      )}

      {outreachJob && (
        <DraftOutreachModal job={outreachJob} onClose={() => setOutreachJob(null)} />
      )}

      {(showRefreshModal || refreshStatus === 'scanning') && (
        <RefreshModal
          status={refreshStatus}
          onCancel={() => {
            if (refreshStatus !== 'scanning') setShowRefreshModal(false);
          }}
          onConfirm={handleRefreshStart}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.kind === 'error' ? (
            <AlertCircle className="toast-icon toast-icon-error" />
          ) : (
            <CheckCircle2 className="toast-icon" />
          )}
          <span className="toast-text">{toast.text}</span>
          {toast.pageUrl && (
            <a
              className="toast-link"
              href={toast.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Notion ↗
            </a>
          )}
          <button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
            <X className="toast-icon" />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
