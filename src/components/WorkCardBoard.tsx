import { useCallback, useEffect, useMemo, useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { WorkCard, WorkCardRisk, WorkCardStatus } from '../types';
import { getWorkCardLaneId } from '../types';
import { WorkCard as WorkCardPrimitive } from './Cards/WorkCard';
import { EmptyState } from './Feedback/EmptyState';
import { WorkCardDrawer } from './WorkCardDrawer';

const LANES: WorkCardStatus[] = ['planned', 'active', 'blocked', 'review', 'complete'];
const RISKS: WorkCardRisk[] = ['GREEN', 'YELLOW', 'RED'];

const REFRESH_DEFAULT_MS = 60_000;
const REFRESH_MIN_MS = 5_000;

/**
 * Group work cards into status lanes. Exported for unit tests; pure function
 * with no React dependency so it can be exercised without a DOM.
 */
export function groupCardsByStatus(cards: WorkCard[]): Record<WorkCardStatus, WorkCard[]> {
  const out: Record<WorkCardStatus, WorkCard[]> = {
    planned: [], active: [], blocked: [], review: [], complete: [],
  };
  for (const card of cards) {
    const laneId = getWorkCardLaneId(card);
    if (out[laneId]) out[laneId].push(card);
  }
  return out;
}

/**
 * Apply owner + risk filters. Empty filter sets are no-ops. Returns the
 * same shape as `groupCardsByStatus` but only with filtered cards.
 */
export function filterCards(
  cards: WorkCard[],
  options: { owner?: string | null; risk?: WorkCardRisk | null } = {},
): WorkCard[] {
  const owner = options.owner?.trim() || null;
  const risk = options.risk || null;
  return cards.filter(card => {
    if (owner && card.owner.toLowerCase() !== owner.toLowerCase()) return false;
    if (risk && card.risk !== risk) return false;
    return true;
  });
}

export function uniqueOwners(cards: WorkCard[]): string[] {
  const set = new Set<string>();
  for (const card of cards) set.add(card.owner);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function configuredRefreshMs(): number {
  const raw = import.meta.env.VITE_WORKCARD_REFRESH_SEC;
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  const seconds = Number.isFinite(parsed) && parsed >= REFRESH_MIN_MS / 1000 ? parsed : REFRESH_DEFAULT_MS / 1000;
  return seconds * 1000;
}

export type WorkCardBoardProps = {
  refreshMs?: number;
};

export function WorkCardBoard({ refreshMs }: WorkCardBoardProps = {}) {
  const effectiveRefresh = refreshMs ?? configuredRefreshMs();
  const [cards, setCards] = useState<WorkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<WorkCardRisk | ''>('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await strongholdApi.fetchWorkCards();
      // Defensive: snapshot-backed stubs and other non-array responses should
      // not crash the board. Treat anything that's not an array of cards as
      // "empty" and surface a clear error message.
      const safeCards = Array.isArray(fetched) ? (fetched as WorkCard[]) : [];
      if (!Array.isArray(fetched)) {
        setError('Work cards endpoint did not return an array — board rendered empty');
      }
      setCards(safeCards);
      setLastLoadedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch work cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
    const intervalId = window.setInterval(() => { void loadCards(); }, effectiveRefresh);
    return () => window.clearInterval(intervalId);
  }, [loadCards, effectiveRefresh]);

  const filtered = useMemo(() => filterCards(cards, { owner: ownerFilter || null, risk: riskFilter || null }), [cards, ownerFilter, riskFilter]);
  const grouped = useMemo(() => groupCardsByStatus(filtered), [filtered]);
  const owners = useMemo(() => uniqueOwners(cards), [cards]);
  const selectedCard = useMemo(() => cards.find(card => card.workCardId === selectedCardId) || null, [cards, selectedCardId]);

  const refreshSeconds = Math.round(effectiveRefresh / 1000);
  const totalLabel = `${filtered.length}/${cards.length} cards`;

  return (
    <section
      className="workCardBoard"
      aria-label="Work card board"
      data-work-card-board="true"
      data-section-id="work"
      id="section-work"
    >
      <header className="workCardBoardHeader">
        <div>
          <h3>Work Card Board</h3>
          <p className="muted">Live cards grouped by status · {totalLabel} · refreshes every {refreshSeconds}s</p>
        </div>
        <div className="workCardBoardActions">
          {error ? <span className="status warn">error</span> : <span className="status live">live</span>}
          <button type="button" className="agenticOsRecheck" onClick={() => { void loadCards(); }} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="workCardBoardFilters" role="group" aria-label="Work card filters">
        <label className="workCardBoardFilter">
          <span>Owner</span>
          <select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)}>
            <option value="">All owners</option>
            {owners.map(owner => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </label>
        <label className="workCardBoardFilter">
          <span>Risk</span>
          <select value={riskFilter} onChange={event => setRiskFilter(event.target.value as WorkCardRisk | '')}>
            <option value="">All risks</option>
            {RISKS.map(risk => <option key={risk} value={risk}>{risk}</option>)}
          </select>
        </label>
        {(ownerFilter || riskFilter) ? (
          <button type="button" className="agenticOsRecheck" onClick={() => { setOwnerFilter(''); setRiskFilter(''); }}>
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? <p className="workCardFeedError" role="alert">{error}</p> : null}

      <div className="workCardBoardLanes">
        {LANES.map(lane => (
          <div key={lane} className={`workCardBoardLane workCardBoardLane-${lane}`} data-lane={lane} data-lane-count={grouped[lane].length}>
            <header className="workCardBoardLaneHeader">
              <h4>{lane}</h4>
              <span className="muted">{grouped[lane].length}</span>
            </header>
            <div className="workCardBoardLaneCards">
              {grouped[lane].length === 0 ? (
                <EmptyState title="Lane is empty" />
              ) : grouped[lane].map(card => (
                <WorkCardPrimitive
                  key={card.workCardId}
                  id={card.workCardId}
                  title={card.title}
                  subtitle={`risk ${card.risk.toLowerCase()} · qc ${card.qc}`}
                  laneId={getWorkCardLaneId(card)}
                  owner={card.owner}
                  status={card.status}
                  dueAt={card.schedule}
                  priority={card.risk === 'RED' ? 'critical' : card.risk === 'YELLOW' ? 'high' : 'normal'}
                  onOpen={setSelectedCardId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {lastLoadedAt ? <p className="workCardFeedLoaded muted">Last checked {new Date(lastLoadedAt).toLocaleString()}</p> : null}

      <WorkCardDrawer card={selectedCard} onClose={() => setSelectedCardId(null)} />
    </section>
  );
}