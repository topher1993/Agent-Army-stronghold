import { useCallback, useEffect, useMemo, useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { WorkCard, WorkCardRisk } from '../types';

type WorkCardFeedState = {
  cards: WorkCard[];
  loading: boolean;
  error: string | null;
  lastLoadedAt: string | null;
};

const DEFAULT_REFRESH_SECONDS = 60;
const MIN_REFRESH_SECONDS = 5;

function configuredRefreshMs(): number {
  const raw = import.meta.env.VITE_WORKCARD_REFRESH_SEC;
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  const seconds = Number.isFinite(parsed) && parsed >= MIN_REFRESH_SECONDS ? parsed : DEFAULT_REFRESH_SECONDS;
  return seconds * 1000;
}

function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

function riskClass(risk: WorkCardRisk): string {
  return risk.toLowerCase();
}

function riskLabel(risk: WorkCardRisk): string {
  if (risk === 'GREEN') return 'green';
  if (risk === 'YELLOW') return 'yellow';
  return 'red';
}

export function WorkCardFeed() {
  const refreshMs = useMemo(() => configuredRefreshMs(), []);
  const refreshSeconds = Math.round(refreshMs / 1000);
  const [state, setState] = useState<WorkCardFeedState>({
    cards: [],
    loading: true,
    error: null,
    lastLoadedAt: null,
  });

  const loadCards = useCallback(async () => {
    setState(current => ({ ...current, loading: true, error: null }));
    try {
      const cards = await strongholdApi.fetchWorkCards();
      setState({
        cards,
        loading: false,
        error: null,
        lastLoadedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch work cards';
      setState(current => ({ ...current, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void loadCards();
    const intervalId = window.setInterval(() => {
      void loadCards();
    }, refreshMs);
    return () => window.clearInterval(intervalId);
  }, [loadCards, refreshMs]);

  return (
    <section className="workCardFeed" aria-label="Live work card feed" data-work-card-feed="true">
      <header className="workCardFeedHeader">
        <div>
          <h3>Live Work Cards</h3>
          <p className="muted">Source: agent-army work-card markdown · refreshes every {refreshSeconds}s</p>
        </div>
        <div className="workCardFeedActions">
          {state.error ? <span className="status warn">error</span> : <span className="status live">live</span>}
          <button type="button" className="agenticOsRecheck" onClick={() => { void loadCards(); }} disabled={state.loading}>
            {state.loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {state.error ? <p className="workCardFeedError" role="alert">{state.error}</p> : null}

      {state.loading && state.cards.length === 0 ? (
        <div className="workCardFeedState" data-work-card-state="loading">Loading live work cards…</div>
      ) : null}

      {!state.loading && !state.error && state.cards.length === 0 ? (
        <div className="workCardFeedState" data-work-card-state="empty">No valid work cards found.</div>
      ) : null}

      {state.cards.length > 0 ? (
        <div className="workCardFeedGrid" data-work-card-count={state.cards.length}>
          {state.cards.map(card => (
            <article className="workCardFeedCard" data-risk={riskClass(card.risk)} data-status={card.status} key={card.workCardId}>
              <div className="workCardFeedCardTop">
                <span className="agenticOsWorkBadge">{card.workCardId}</span>
                <span className={`workCardRiskBadge ${riskClass(card.risk)}`}>risk {riskLabel(card.risk)}</span>
              </div>
              <h4 className="workCardFeedTitle">{card.title}</h4>
              <div className="workCardFeedMeta">
                <span className="muted">{card.owner}</span>
                <span className={`status ${card.status}`}>{card.status}</span>
              </div>
              <div className="workCardFeedFooter">
                <span className="agenticOsMono">updated</span>
                <time className="agenticOsMono" dateTime={card.lastUpdated}>{formatTimestamp(card.lastUpdated)}</time>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {state.lastLoadedAt ? (
        <p className="workCardFeedLoaded muted">Last checked {formatTimestamp(state.lastLoadedAt)}</p>
      ) : null}
    </section>
  );
}
