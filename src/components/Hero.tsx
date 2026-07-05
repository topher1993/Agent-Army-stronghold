import type { StrongholdSnapshot } from '../types';

export type HeroProps = {
  snapshot: StrongholdSnapshot;
  backendOk: boolean;
  killSwitch: string;
  onRefresh: () => void;
};

/**
 * Hero header — title block, GUARDED ribbon, refresh button, metadata grid.
 * Phase 46 layout; Phase 47 keeps it identical (sidebar is the only new piece).
 */
export function Hero({ snapshot, backendOk, killSwitch, onRefresh }: HeroProps) {
  return (
    <header className="hero commandHeader">
      <div className="heroTitleBlock">
        <div className="heroTitleRow">
          <p className="eyebrow">Engineering Division Stronghold</p>
          <span
            className="heroGuarded"
            title="Profile edits, cron edits, real wrapper dispatch, and command execution are not exposed in Stronghold."
          >
            GUARDED · Approvals · Artifacts · No shell
          </span>
        </div>
        <h1>Agent-Army Mission Control</h1>
        <p className="subtitle">
          Igris-owned Stronghold cockpit for visibility, guarded proposals, approval workflows, and safe mock agent orchestration.
        </p>
      </div>
      <button
        type="button"
        className="heroRefreshAll"
        onClick={onRefresh}
        aria-label="Refresh everything"
        title="Reload snapshot + all panels"
      >
        ↻ Refresh everything
      </button>
      <dl className="heroMeta">
        <div><dt>Owner</dt><dd>{snapshot.owner}</dd></div>
        <div><dt>Coordinator</dt><dd>{snapshot.coordinator}</dd></div>
        <div>
          <dt>Backend</dt>
          <dd>
            {backendOk ? <span className="status ok">connected</span> : <span className="status warn">offline fallback</span>}
          </dd>
        </div>
        <div><dt>Kill Switch</dt><dd>{killSwitch}</dd></div>
        <div><dt>Generated</dt><dd>{new Date(snapshot.generatedAt).toLocaleString()}</dd></div>
      </dl>
    </header>
  );
}