import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { WorkCard, WorkCardRisk, WorkCardStatus } from '../types';
import { getWorkCardLaneId } from '../types';
import { WorkCard as WorkCardPrimitive } from './Cards/WorkCard';
import { EmptyState } from './Feedback/EmptyState';
import { WorkCardDrawer } from './WorkCardDrawer';
import { useToast } from './Controls/Toast';
import { useAnnounce } from './Shell/LiveRegionProvider';

const LANES: WorkCardStatus[] = ['planned', 'active', 'blocked', 'review', 'complete'];
const RISKS: WorkCardRisk[] = ['GREEN', 'YELLOW', 'RED'];
const STORAGE_KEY = 'stronghold.workBoard.lanes';

const REFRESH_DEFAULT_MS = 60_000;
const REFRESH_MIN_MS = 5_000;

export function groupCardsByStatus(cards: WorkCard[]): Record<WorkCardStatus, WorkCard[]> {
  const out: Record<WorkCardStatus, WorkCard[]> = { planned: [], active: [], blocked: [], review: [], complete: [] };
  for (const card of cards) {
    const laneId = getWorkCardLaneId(card);
    if (out[laneId]) out[laneId].push(card);
  }
  return out;
}

export function filterCards(cards: WorkCard[], options: { owner?: string | null; risk?: WorkCardRisk | null } = {}): WorkCard[] {
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

function readLaneOverrides(): Record<string, WorkCardStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<WorkCardStatus, string[]>>;
    const out: Record<string, WorkCardStatus> = {};
    for (const lane of LANES) for (const id of parsed[lane] || []) out[id] = lane;
    return out;
  } catch { return {}; }
}

function applyLaneOverrides(cards: WorkCard[]): WorkCard[] {
  const overrides = readLaneOverrides();
  return cards.map(card => overrides[card.workCardId] ? { ...card, laneId: overrides[card.workCardId], status: overrides[card.workCardId] } : card);
}

export type WorkCardBoardProps = { refreshMs?: number; onCardUpdate?: (id: string, patch: Partial<WorkCard>) => void };

export function WorkCardBoard({ refreshMs, onCardUpdate }: WorkCardBoardProps = {}) {
  const effectiveRefresh = refreshMs ?? configuredRefreshMs();
  const [cards, setCards] = useState<WorkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<WorkCardRisk | ''>('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<WorkCardStatus | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkLane, setBulkLane] = useState<WorkCardStatus>('active');
  const [kbSourceId, setKbSourceId] = useState<string | null>(null);
  const [kbLane, setKbLane] = useState<WorkCardStatus>('planned');
  const suppressClickUntil = useRef(0);
  const { showToast } = useToast();
  const announce = useAnnounce();

  const persistCards = useCallback((nextCards: WorkCard[]) => {
    try {
      const groupedNext = groupCardsByStatus(nextCards);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(LANES.map(lane => [lane, groupedNext[lane].map(card => card.workCardId)]))));
    } catch { /* localStorage may be disabled */ }
  }, []);

  const updateCards = useCallback((updater: (prev: WorkCard[]) => WorkCard[]) => {
    setCards(prev => {
      const next = updater(prev);
      persistCards(next);
      return next;
    });
  }, [persistCards]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await strongholdApi.fetchWorkCards();
      const safeCards = Array.isArray(fetched) ? applyLaneOverrides(fetched as WorkCard[]) : [];
      if (!Array.isArray(fetched)) setError('Work cards endpoint did not return an array — board rendered empty');
      setCards(safeCards);
      setLastLoadedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch work cards');
      setCards([]);
    } finally { setLoading(false); }
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
  const filteredIds = useMemo(() => filtered.map(card => card.workCardId), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  useEffect(() => {
    if (filtered.length === 0 && !loading) announce('No items to display');
  }, [announce, filtered.length, loading]);

  useEffect(() => {
    if (!kbSourceId) return;
    function onKey(event: KeyboardEvent) {
      const source = cards.find(card => card.workCardId === kbSourceId);
      if (!source) return;
      const currentIndex = LANES.indexOf(kbLane);
      if (event.key === 'Escape') { event.preventDefault(); setKbSourceId(null); announce('Move cancelled'); }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); const next = LANES[Math.min(currentIndex + 1, LANES.length - 1)]; setKbLane(next); announce(`Moved to ${next.toUpperCase()} lane`); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); const next = LANES[Math.max(currentIndex - 1, 0)]; setKbLane(next); announce(`Moved to ${next.toUpperCase()} lane`); }
      if (event.key === ' ') { event.preventDefault(); moveCards([source.workCardId], kbLane); setKbSourceId(null); announce(`Dropped in ${kbLane.toUpperCase()}`); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [announce, cards, kbLane, kbSourceId]);

  function moveCards(ids: string[], lane: WorkCardStatus, withUndo = false) {
    const before = cards;
    updateCards(prev => prev.map(card => ids.includes(card.workCardId) ? { ...card, status: lane, laneId: lane } : card));
    announce(`Moved to ${lane.toUpperCase()} lane`);
    if (withUndo) {
      showToast({ tone: 'success', title: 'Moved', description: `${ids.length} card${ids.length === 1 ? '' : 's'} moved to ${lane}.`, duration: 5000, undo: { label: 'Undo', ttlMs: 5000, onClick: () => { setCards(before); persistCards(before); announce('Move undone'); } } });
    }
  }

  function deleteCards(ids: string[]) {
    const before = cards;
    updateCards(prev => prev.filter(card => !ids.includes(card.workCardId)));
    setSelectedIds(new Set());
    showToast({ tone: 'warning', title: 'Deleted', description: `${ids.length} card${ids.length === 1 ? '' : 's'} removed from Work board.`, duration: 5000, undo: { label: 'Undo', ttlMs: 5000, onClick: () => { setCards(before); persistCards(before); announce('Delete undone'); } } });
  }

  const toggleSelected = (id: string) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectedCount = selectedIds.size;
  const refreshSeconds = Math.round(effectiveRefresh / 1000);
  const totalLabel = `${filtered.length}/${cards.length} cards`;
  const selectedList = [...selectedIds];

  function handleCardOpen(id: string) {
    if (Date.now() < suppressClickUntil.current) return;
    setSelectedCardId(id);
  }

  function handleDrop(event: React.DragEvent, lane: WorkCardStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    setDragOverLane(null);
    if (id) moveCards([id], lane);
  }

  return (
    <section className="workCardBoard" aria-label="Work card board" data-work-card-board="true" data-section-id="work" id="section-work">
      <header className="workCardBoardHeader">
        <div><h3>Work Card Board</h3><p className="muted">Live cards grouped by status · {totalLabel} · refreshes every {refreshSeconds}s</p></div>
        <div className="workCardBoardActions">
          {error ? <span className="status warn">error</span> : <span className="status live">live</span>}
          <button type="button" className="agenticOsRecheck" onClick={() => { void loadCards(); }} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </header>

      <div className="workCardBoardFilters" role="group" aria-label="Work card filters">
        <label className="workCardBoardFilter"><span>Owner</span><select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)}><option value="">All owners</option>{owners.map(owner => <option key={owner} value={owner}>{owner}</option>)}</select></label>
        <label className="workCardBoardFilter"><span>Risk</span><select value={riskFilter} onChange={event => setRiskFilter(event.target.value as WorkCardRisk | '')}><option value="">All risks</option>{RISKS.map(risk => <option key={risk} value={risk}>{risk}</option>)}</select></label>
        <label className="workCardBoardFilter"><span>Select all</span><input type="checkbox" checked={allFilteredSelected} onChange={event => setSelectedIds(event.target.checked ? new Set(filteredIds) : new Set())} aria-label="Select all work cards" /></label>
        {(ownerFilter || riskFilter) ? <button type="button" className="agenticOsRecheck" onClick={() => { setOwnerFilter(''); setRiskFilter(''); }}>Clear filters</button> : null}
      </div>

      {error ? <p className="workCardFeedError" role="alert">{error}</p> : null}

      <div className="workCardBoardLanes">
        {LANES.map(lane => (
          <div key={lane} className={`workCardBoardLane workCardBoardLane-${lane}`} data-lane={lane} data-lane-count={grouped[lane].length} data-drag-over={dragOverLane === lane ? 'true' : undefined}>
            <header className="workCardBoardLaneHeader"><h4>{lane}</h4><span className="muted">{grouped[lane].length}</span></header>
            <div className="workCardBoardLaneCards" onDragOver={event => event.preventDefault()} onDragEnter={() => setDragOverLane(lane)} onDragLeave={() => setDragOverLane(current => current === lane ? null : current)} onDrop={event => handleDrop(event, lane)}>
              {grouped[lane].length === 0 ? <EmptyState title="Lane is empty" /> : grouped[lane].map(card => (
                <div
                  key={card.workCardId}
                  className="workCardBoardCardWrap"
                  draggable
                  data-card-id={card.workCardId}
                  data-keyboard-pickup={kbSourceId === card.workCardId ? 'true' : undefined}
                  onDragStart={event => { event.dataTransfer.setData('text/plain', card.workCardId); event.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { suppressClickUntil.current = Date.now() + 200; setDragOverLane(null); }}
                  onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); setKbSourceId(card.workCardId); setKbLane(getWorkCardLaneId(card)); announce(`Picked up card ${card.title}. Use arrow keys to choose lane. Space to drop, Escape to cancel.`); } }}
                >
                  <input type="checkbox" className="workCardSelect" aria-label={`Select ${card.title}`} checked={selectedIds.has(card.workCardId)} onChange={() => toggleSelected(card.workCardId)} onClick={event => event.stopPropagation()} />
                  <WorkCardPrimitive id={card.workCardId} title={card.title} subtitle={`risk ${card.risk.toLowerCase()} · qc ${card.qc}`} laneId={getWorkCardLaneId(card)} owner={card.owner} status={card.status} dueAt={card.schedule} priority={card.risk === 'RED' ? 'critical' : card.risk === 'YELLOW' ? 'high' : 'normal'} selected={selectedIds.has(card.workCardId)} onOpen={handleCardOpen} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedCount > 0 ? (
        <div className="bulkActionBar" role="region" aria-label="Work bulk actions">
          <span className="bulkActionBar__count">{selectedCount} selected</span>
          <div className="bulkActionBar__actions">
            <label className="bulkActionBar__select">Move to lane <select value={bulkLane} onChange={event => setBulkLane(event.target.value as WorkCardStatus)}>{LANES.map(lane => <option key={lane} value={lane}>{lane}</option>)}</select></label>
            <button type="button" onClick={() => { moveCards(selectedList, bulkLane, true); setSelectedIds(new Set()); }}>Move</button>
            <button type="button" onClick={() => { moveCards(selectedList, 'complete', true); setSelectedIds(new Set()); }}>Mark complete</button>
            <button type="button" className="btn-secondary" onClick={() => deleteCards(selectedList)}>Delete</button>
          </div>
          <button type="button" className="bulkActionBar__clear" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
        </div>
      ) : null}

      {lastLoadedAt ? <p className="workCardFeedLoaded muted">Last checked {new Date(lastLoadedAt).toLocaleString()}</p> : null}

      <WorkCardDrawer card={selectedCard} onClose={() => setSelectedCardId(null)} onUpdate={(id, patch) => { updateCards(prev => prev.map(card => card.workCardId === id ? { ...card, ...patch } : card)); onCardUpdate?.(id, patch); }} />
    </section>
  );
}
