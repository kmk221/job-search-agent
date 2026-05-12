import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  MapPin,
  DollarSign,
  Sparkles,
  Plus,
  X,
  PenLine,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
  Info,
  Building2,
  FileText,
  Target,
  Clock,
  Zap,
} from 'lucide-react';
import './App.css';
import { useSavedJobs } from './hooks/useSavedJobs';
import AddJobModal from './components/AddJobModal';
import DraftOutreachModal from './components/DraftOutreachModal';
import RefreshModal from './components/RefreshModal';
import JobDetailPane from './components/JobDetailPane';
import JobDetailEmpty from './components/JobDetailEmpty';
import { formatTimeAgo, isNewJob, isStaleRefresh } from './utils';

// --- Data transforms ---

function applyFilters(list, query, locations, stages) {
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
  if (locations.length > 0) {
    filtered = filtered.filter((job) =>
      locations.some((loc) =>
        (job.location || '').toLowerCase().includes(loc.toLowerCase())
      )
    );
  }
  if (stages.length > 0) {
    filtered = filtered.filter((job) => stages.includes(job.stage));
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
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [sortOrder, setSortOrder] = useState('fit');
  const [selectedJob, setSelectedJob] = useState(null);
  const [manuallyDeselected, setManuallyDeselected] = useState(false);
  const [usingKeyboard, setUsingKeyboard] = useState(false);
  const [userTargets, setUserTargets] = useState([]);
  const [notionSync, setNotionSync] = useState({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [outreachJob, setOutreachJob] = useState(null);
  const [toast, setToast] = useState(null);

  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [lastRefreshInfo, setLastRefreshInfo] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFailedCompanies, setShowFailedCompanies] = useState(false);
  const [showStatsPopover, setShowStatsPopover] = useState(false);
  const statsPopoverRef = useRef(null);

  const [notInterestedIds, setNotInterestedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('notInterestedIds');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [showDismissed, setShowDismissed] = useState(false);

  const searchInputRef = useRef(null);

  // Jobs visible in the list (filtered + dismissed excluded unless showDismissed)
  const visibleJobs = useMemo(() => {
    const base = showDismissed
      ? filteredJobs
      : filteredJobs.filter((j) => !notInterestedIds.includes(j.id));
    if (sortOrder === 'fit') {
      return [...base].sort((a, b) => b.fitScore - a.fitScore);
    }
    if (sortOrder === 'newest') {
      return [...base].sort(
        (a, b) => new Date(b.fetchedAt || 0) - new Date(a.fetchedAt || 0)
      );
    }
    return base;
  }, [filteredJobs, notInterestedIds, showDismissed, sortOrder]);

  // Refs so the keyboard handler always reads current values without re-registering
  const filteredJobsRef = useRef(visibleJobs);
  filteredJobsRef.current = visibleJobs;
  const notionSyncRef = useRef(notionSync);
  notionSyncRef.current = notionSync;
  const selectedJobRef = useRef(selectedJob);
  selectedJobRef.current = selectedJob;

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
    setFilteredJobs(applyFilters(combined, searchQuery, selectedLocations, selectedStages));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualJobs, scrapedJobs]);

  // Auto-select first visible job when visible list changes (unless user explicitly deselected)
  useEffect(() => {
    if (manuallyDeselected) return;
    if (visibleJobs.length === 0) {
      setSelectedJob(null);
      return;
    }
    setSelectedJob((prev) => {
      if (!prev) return visibleJobs[0];
      if (visibleJobs.find((j) => j.id === prev.id)) return prev;
      return visibleJobs[0];
    });
  }, [visibleJobs, manuallyDeselected]);

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

  useEffect(() => {
    if (!showStatsPopover) return;
    const handler = (e) => {
      if (statsPopoverRef.current && !statsPopoverRef.current.contains(e.target)) {
        setShowStatsPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatsPopover]);

  // Keyboard navigation — registered once, reads current values via refs
  useEffect(() => {
    const handleKeyDown = (e) => {
      const active = document.activeElement;
      const inInput =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT');

      if (e.key === '/') {
        if (!inInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (inInput) return;

      const currentJobs = filteredJobsRef.current;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setUsingKeyboard(true);
        setManuallyDeselected(false);
        setSelectedJob((prev) => {
          if (!prev || currentJobs.length === 0) return currentJobs[0] || null;
          const idx = currentJobs.findIndex((j) => j.id === prev.id);
          if (idx === -1) return currentJobs[0];
          const nextIdx =
            e.key === 'ArrowDown'
              ? Math.min(idx + 1, currentJobs.length - 1)
              : Math.max(idx - 1, 0);
          return currentJobs[nextIdx];
        });
      } else if (e.key === 'Escape') {
        setSelectedJob(null);
        setManuallyDeselected(true);
        setUsingKeyboard(false);
      } else if (e.key === 'Enter') {
        const current = selectedJobRef.current;
        if (!current) return;
        const sync = notionSyncRef.current;
        const entry = sync[current.id];
        if (entry?.status === 'saved' && entry.pageUrl) {
          window.open(entry.pageUrl, '_blank', 'noopener,noreferrer');
        } else if (entry?.status !== 'saving' && entry?.status !== 'removing') {
          // Trigger save — call the stable ref version to avoid stale closure
          saveToNotionRef.current(current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        successfulFetches: data.successfulFetches,
        failedCompanies: data.failedCompanies || [],
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

  // --- Notion sync ---

  const saveToNotion = useCallback(async (job, e) => {
    if (e) e.stopPropagation();
    const current = notionSyncRef.current[job.id]?.status;
    if (current === 'saving' || current === 'saved') return;

    setNotionSync((prev) => ({ ...prev, [job.id]: { status: 'saving' } }));
    setUserTargets((prev) =>
      prev.includes(job.id) ? prev : [...prev, job.id]
    );

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
          source: job.source || 'Job Search Agent',
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
  }, [updateLocalState]);

  // Stable ref so keyboard handler can call the latest saveToNotion without stale closure
  const saveToNotionRef = useRef(saveToNotion);
  saveToNotionRef.current = saveToNotion;

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

  const handleManualSaved = async ({ pageUrl, title, company }) => {
    setShowAddModal(false);
    setToast({ kind: 'success', text: `Saved "${title}" at ${company} to Notion.`, pageUrl });
    await refetchSavedJobs();
  };

  const toggleTarget = (jobId) => {
    setUserTargets((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const getCriteriaStatus = (job) => {
    const matchCount = Object.values(job.criteria).filter(Boolean).length;
    return `${matchCount}/${Object.keys(job.criteria).length}`;
  };

  const getNorthStarBadgeColor = (alignment) => {
    switch (alignment) {
      case 'Perfect': return 'badge-perfect';
      case 'Strong': return 'badge-strong';
      case 'Moderate': return 'badge-moderate';
      default: return 'badge-default';
    }
  };

  // --- Filter helpers ---

  const selectAfterFilter = useCallback((newFiltered) => {
    setSelectedJob((prev) => {
      if (newFiltered.length === 0) return null;
      if (!prev) return newFiltered[0];
      if (newFiltered.find((j) => j.id === prev.id)) return prev;
      return newFiltered[0];
    });
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const newFiltered = applyFilters(jobs, query, selectedLocations, selectedStages);
    setFilteredJobs(newFiltered);
    selectAfterFilter(newFiltered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLocations([]);
    setSelectedStages([]);
    const newFiltered = applyFilters(jobs, '', [], []);
    setFilteredJobs(newFiltered);
    setManuallyDeselected(false);
    selectAfterFilter(newFiltered);
  };

  const toggleLocation = (loc) => {
    const next = selectedLocations.includes(loc)
      ? selectedLocations.filter((l) => l !== loc)
      : [...selectedLocations, loc];
    setSelectedLocations(next);
    const newFiltered = applyFilters(jobs, searchQuery, next, selectedStages);
    setFilteredJobs(newFiltered);
    selectAfterFilter(newFiltered);
  };

  const toggleStage = (stage) => {
    const next = selectedStages.includes(stage)
      ? selectedStages.filter((s) => s !== stage)
      : [...selectedStages, stage];
    setSelectedStages(next);
    const newFiltered = applyFilters(jobs, searchQuery, selectedLocations, next);
    setFilteredJobs(newFiltered);
    selectAfterFilter(newFiltered);
  };

  const markNotInterested = useCallback((job) => {
    // Advance to next visible job before dismissing
    const currentVisible = filteredJobsRef.current;
    const idx = currentVisible.findIndex((j) => j.id === job.id);
    const remaining = currentVisible.filter((j) => j.id !== job.id);
    const nextJob = remaining.length > 0 ? remaining[Math.min(idx, remaining.length - 1)] : null;

    setNotInterestedIds((prev) => {
      if (prev.includes(job.id)) return prev;
      const next = [...prev, job.id];
      try { localStorage.setItem('notInterestedIds', JSON.stringify(next)); } catch {}
      return next;
    });
    setSelectedJob(nextJob);
    setManuallyDeselected(nextJob === null);
  }, []);

  const undoNotInterested = useCallback((jobId) => {
    setNotInterestedIds((prev) => {
      const next = prev.filter((id) => id !== jobId);
      try { localStorage.setItem('notInterestedIds', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const failedCount = lastRefreshInfo?.failedCompanies?.length || 0;
  // Total evaluated by AI = cached + fresh scored; 70%+ count = what we display from scrape
  const totalEvaluated =
    (lastRefreshInfo?.cachedScores ?? 0) + (lastRefreshInfo?.freshScores ?? 0);
  const highFitCount = scrapedJobs.length;

  // Source breakdown for visible list
  const curatedCount = filteredJobs.filter((j) => typeof j.id === 'number').length;
  const manualCount = filteredJobs.filter((j) => String(j.id).startsWith('manual-')).length;
  const scrapedVisibleCount = filteredJobs.filter(
    (j) => typeof j.id === 'string' && !String(j.id).startsWith('manual-')
  ).length;

  return (
    <div className="container">
      <div className="header">
        <h1>Job Search Agent</h1>
        <p className="subtitle">
          Evaluated against your JOB_SEARCH_SKILL.md + North Star Principle
        </p>
      </div>


      {/* Failed companies panel */}
      {showFailedCompanies && failedCount > 0 && (
        <div className="failed-panel">
          <div className="failed-panel-header">
            <span className="failed-panel-title">
              Failed companies ({failedCount})
            </span>
            <button
              className="modal-close"
              onClick={() => setShowFailedCompanies(false)}
              aria-label="Close"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <ul className="failed-list">
            {lastRefreshInfo.failedCompanies.map((c, i) => (
              <li key={i} className="failed-item">
                <span className="failed-name">{typeof c === 'string' ? c : c.name}</span>
                {c.reason && <span className="failed-reason">{c.reason}</span>}
              </li>
            ))}
          </ul>
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

      {/* === FILTER BAR (full-width, above split) === */}
      <div className="filter-bar">
        <div className="filter-bar-top">
          <div className="filter-bar-search">
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search companies, roles, industries..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <div className="sort-control">
            <span className="sort-label">Sort</span>
            <button
              className={`sort-chip ${sortOrder === 'fit' ? 'sort-chip--active' : ''}`}
              onClick={() => setSortOrder('fit')}
            >
              <Target className="sort-chip-icon" />
              Match %
            </button>
            <button
              className={`sort-chip ${sortOrder === 'newest' ? 'sort-chip--active' : ''}`}
              onClick={() => setSortOrder('newest')}
            >
              <Clock className="sort-chip-icon" />
              Newest
            </button>
          </div>
        </div>
        <div className="filter-chips-row">
          <span className="filter-chips-label">Location</span>
          {['Remote', 'Austin', 'Denver', 'Portland'].map((loc) => (
            <button
              key={loc}
              className={`filter-chip ${selectedLocations.includes(loc) ? 'filter-chip--active' : ''}`}
              onClick={() => toggleLocation(loc)}
            >
              {loc}
            </button>
          ))}
        </div>
        <div className="filter-chips-row">
          <span className="filter-chips-label">Stage</span>
          {['Series B', 'Series D', 'Series E+', 'Public', 'Unicorn'].map((stage) => (
            <button
              key={stage}
              className={`filter-chip ${selectedStages.includes(stage) ? 'filter-chip--active' : ''}`}
              onClick={() => toggleStage(stage)}
            >
              {stage}
            </button>
          ))}
        </div>
        <div className="filter-bar-count">
          {visibleJobs.length} jobs match your filters
          {(curatedCount > 0 || manualCount > 0 || scrapedVisibleCount > 0) && (
            <span className="filter-source-breakdown">
              {[
                curatedCount > 0 && `${curatedCount} curated`,
                manualCount > 0 && `${manualCount} manually added`,
                scrapedVisibleCount > 0 && `${scrapedVisibleCount} from refresh`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {(() => {
            const dismissedInView = filteredJobs.filter((j) =>
              notInterestedIds.includes(j.id)
            ).length;
            return dismissedInView > 0 ? (
              <span className="dismissed-count">
                · {dismissedInView} dismissed
                <button
                  className="btn-link dismissed-toggle"
                  onClick={() => setShowDismissed((v) => !v)}
                >
                  {showDismissed ? 'hide' : 'show'}
                </button>
              </span>
            ) : null;
          })()}
          {lastRefreshInfo && (
            <span className="stats-popover-anchor" ref={statsPopoverRef}>
              <button
                className="stats-info-btn"
                onClick={() => setShowStatsPopover((v) => !v)}
                aria-label="Show refresh stats"
                title="Refresh stats"
              >
                <Info className="stats-info-icon" />
              </button>
              {showStatsPopover && (
                <div className="stats-popover">
                  <div className="stats-popover-row">
                    <Clock className="stats-row-icon" />
                    Last refreshed:{' '}
                    <strong>{formatTimeAgo(lastRefreshInfo.scannedAt)}</strong>
                    {isStaleRefresh(lastRefreshInfo.scannedAt) && (
                      <button
                        className="btn-link stale-nudge-btn"
                        onClick={() => { setShowStatsPopover(false); setShowRefreshModal(true); }}
                      >
                        Refresh now?
                      </button>
                    )}
                  </div>
                  <div className="stats-popover-row">
                    <Building2 className="stats-row-icon" />
                    {lastRefreshInfo.successfulFetches ?? lastRefreshInfo.totalCompaniesScanned ?? '?'} of{' '}
                    {lastRefreshInfo.totalCompaniesScanned ?? '?'} companies scanned
                    {failedCount > 0 && (
                      <button
                        className="failed-link"
                        onClick={() => { setShowStatsPopover(false); setShowFailedCompanies((v) => !v); }}
                      >
                        ({failedCount} failed)
                      </button>
                    )}
                  </div>
                  <div className="stats-popover-row">
                    <FileText className="stats-row-icon" />
                    {lastRefreshInfo.designProductJobsAfterFilter} design/product roles found
                  </div>
                  {totalEvaluated > 0 && (
                    <div className="stats-popover-row">
                      <Sparkles className="stats-row-icon" />
                      {totalEvaluated} evaluated by AI{' '}
                      <span className="refresh-cache-note">
                        ({lastRefreshInfo.cachedScores} cached, {lastRefreshInfo.freshScores} fresh)
                      </span>
                    </div>
                  )}
                  <div className="stats-popover-row">
                    <Target className="stats-row-icon" />
                    <strong>{highFitCount}</strong> scored 70%+
                  </div>
                </div>
              )}
            </span>
          )}
        </div>
      </div>

      {/* === SPLIT PANEL LAYOUT === */}
      <div className="split-panel">

        {/* LEFT: Job list */}
        <div className="split-list">
          {/* Job rows */}
          <div className="jobs-list">
            {visibleJobs.length === 0 ? (
              <div className="empty">
                <p>No jobs match your filters. Try adjusting your search.</p>
              </div>
            ) : (
              visibleJobs.map((job, index) => {
                const isSelected = selectedJob?.id === job.id;
                const isDismissed = notInterestedIds.includes(job.id);
                return (
                  <div
                    key={job.id}
                    className={`job-row ${isSelected ? 'job-row--selected' : ''} ${isDismissed ? 'job-row--dismissed' : ''}`}
                    onClick={() => {
                      if (isDismissed) return;
                      setSelectedJob(job);
                      setManuallyDeselected(false);
                      setUsingKeyboard(false);
                    }}
                  >
                    <span className="row-number">{index + 1}</span>
                    <div className="row-body">
                      <div className="row-top">
                        <div className="row-title-block">
                          <span className="row-title">{job.title}</span>
                          <span className="row-company">{job.company}</span>
                        </div>
                        <div className="row-badges">
                          {isNewJob(job.fetchedAt) && (
                            <div className="badge badge-new"><Zap className="badge-icon" />New</div>
                          )}
                          <div
                            className={`badge fit-badge ${
                              job.fitScore >= 85 ? 'badge-high' : 'badge-mid'
                            }`}
                          >
                            {job.fitScore}%
                          </div>
                          <div className={`badge ${getNorthStarBadgeColor(job.northStarAlignment)}`}>
                            <Sparkles className="badge-icon" />
                            <span className="badge-align-label">{job.northStarAlignment}</span>
                          </div>
                          {job.source === 'Manual entry' && (
                            <div className="badge badge-manual" title="Manually added">
                              <PenLine className="badge-icon" />
                            </div>
                          )}
                        </div>
                      </div>
                      {isDismissed ? (
                        <div className="row-dismissed-label">
                          Not interested
                          <button
                            className="btn-link row-undo-btn"
                            onClick={(e) => { e.stopPropagation(); undoNotInterested(job.id); }}
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <div className="row-meta">
                          <span className="meta-item meta-item--small">
                            {job.location}
                          </span>
                          {job.salary && (
                            <span className="meta-item meta-item--small">{job.salary}</span>
                          )}
                          {job.stage && (
                            <span className="meta-badge meta-badge--small">{job.stage}</span>
                          )}
                          <span className="criteria-count-small">
                            {getCriteriaStatus(job)} criteria
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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
        </div>

        {/* RIGHT: Detail pane (desktop only — hidden via CSS on mobile) */}
        <aside className="split-detail">
          <div className="split-detail-inner">
            {selectedJob ? (
              <JobDetailPane
                job={selectedJob}
                notionSync={notionSync}
                savedLoading={savedLoading}
                userTargets={userTargets}
                onSave={saveToNotion}
                onRemove={removeFromNotion}
                onDraftOutreach={setOutreachJob}
                showKeyboardHints={usingKeyboard}
                isNotInterested={notInterestedIds.includes(selectedJob.id)}
                onNotInterested={markNotInterested}
                onUndoNotInterested={undoNotInterested}
              />
            ) : (
              <JobDetailEmpty
                listIsEmpty={filteredJobs.length === 0}
                onClearFilters={clearFilters}
                onRefresh={() => setShowRefreshModal(true)}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Mobile drawer — visible only on small screens via CSS */}
      {selectedJob && (
        <div
          className="detail-drawer-backdrop"
          onClick={() => {
            setSelectedJob(null);
            setManuallyDeselected(true);
          }}
        >
          <div
            className="detail-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedJob.title} at ${selectedJob.company}`}
          >
            <div className="detail-drawer-header">
              <span className="detail-drawer-title">Job Details</span>
              <button
                className="modal-close"
                onClick={() => {
                  setSelectedJob(null);
                  setManuallyDeselected(true);
                }}
                aria-label="Close"
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div className="detail-drawer-body">
              <JobDetailPane
                job={selectedJob}
                notionSync={notionSync}
                savedLoading={savedLoading}
                userTargets={userTargets}
                onSave={saveToNotion}
                onRemove={removeFromNotion}
                onDraftOutreach={setOutreachJob}
                showKeyboardHints={false}
                isNotInterested={notInterestedIds.includes(selectedJob.id)}
                onNotInterested={markNotInterested}
                onUndoNotInterested={undoNotInterested}
              />
            </div>
          </div>
        </div>
      )}

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
