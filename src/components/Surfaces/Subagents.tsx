import { useMemo, useState } from 'react';
import type { Agent, Mission, ProfileSummary, StrongholdSnapshot } from '../../types';
import { Panel } from '../Cards/Panel';
import { Stat } from '../Cards/Stat';
import { StatusPill, type StatusPillTone } from '../Feedback/StatusPill';
import { EmptyState } from '../Feedback/EmptyState';

export type SubagentProfileRow = {
  name: string;
  role: string;
  wrapper: string;
  wrapperAvailable: boolean | null;
  wrapperState: 'available' | 'busy' | 'unknown';
  skillCount: number;
  missionCount: number;
};

type WrapperFilter = 'all' | 'available' | 'busy';
const WRAPPER_FILTER_KEY = 'stronghold.subagents.wrapperFilter';

function normalize(value: string | undefined): string { return (value || '').trim().toLowerCase(); }
function rosterMatch(profile: ProfileSummary, roster: Agent[]): Agent | undefined { const name = normalize(profile.name); return roster.find(agent => normalize(agent.name) === name || normalize(agent.target) === name || normalize(agent.installedWrapper) === name || normalize(agent.wrapperStatus?.wrapper) === name); }
function ownsMission(profileName: string, mission: Mission): boolean { const name = normalize(profileName); return normalize(mission.owner) === name || mission.specialists.some(s => normalize(s) === name); }
function readWrapperFilter(): WrapperFilter { try { const value = window.localStorage.getItem(WRAPPER_FILTER_KEY); if (value === 'all' || value === 'available' || value === 'busy') return value; } catch { /* ignore */ } return 'all'; }
function writeWrapperFilter(value: WrapperFilter) { try { window.localStorage.setItem(WRAPPER_FILTER_KEY, value); } catch { /* ignore */ } }

export function buildSubagentRows(snapshot: StrongholdSnapshot): SubagentProfileRow[] {
  return snapshot.profiles.map(profile => {
    const agent = rosterMatch(profile, snapshot.roster);
    const missionCount = snapshot.missions.filter(mission => ownsMission(profile.name, mission)).length;
    const available = agent?.wrapperStatus ? agent.wrapperStatus.available : null;
    const wrapperState: SubagentProfileRow['wrapperState'] = available === true ? 'available' : available === false ? 'busy' : 'unknown';
    return { name: profile.name, role: agent?.role || 'Unassigned/Profile', wrapper: agent?.wrapperStatus?.wrapper || agent?.installedWrapper || agent?.wrapper || '—', wrapperAvailable: available, wrapperState, skillCount: profile.skillCount, missionCount };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function formatCost(value: number | null | undefined) { return typeof value === 'number' ? `$${value.toFixed(2)}` : '--'; }
function formatTokens(value: number | null | undefined) { return typeof value === 'number' ? value.toLocaleString() : '--'; }
function relativeTime(value: string | null | undefined) { if (!value) return '--'; const diff = Date.now() - Date.parse(value); if (!Number.isFinite(diff)) return '--'; const mins = Math.max(0, Math.round(diff / 60000)); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`; const hours = Math.round(mins / 60); return `${hours}h ago`; }
function wrapperTone(row: SubagentProfileRow): StatusPillTone { return row.wrapperAvailable === true ? 'success' : row.wrapperAvailable === false ? 'danger' : 'neutral'; }

export default function Subagents({ snapshot }: { snapshot: StrongholdSnapshot }) {
  const rows = useMemo(() => buildSubagentRows(snapshot), [snapshot]);
  const roles = useMemo(() => ['All roles', ...Array.from(new Set(rows.map(r => r.role))).sort()], [rows]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All roles');
  const [wrapperFilter, setWrapperFilter] = useState<WrapperFilter>(() => typeof window === 'undefined' ? 'all' : readWrapperFilter());
  const stats = snapshot.subagentsStats;
  const unavailable = 'rate unavailable';
  const filtered = rows.filter(row => {
    const matchesQuery = row.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesRole = role === 'All roles' || row.role === role;
    const matchesWrapper = wrapperFilter === 'all' || row.wrapperState === wrapperFilter;
    return matchesQuery && matchesRole && matchesWrapper;
  });
  const setWrapper = (value: WrapperFilter) => { setWrapperFilter(value); writeWrapperFilter(value); };
  const clearFilters = () => { setQuery(''); setRole('All roles'); setWrapper('all'); };
  return <section className="subagentDashboard surfaceContent" aria-label="Subagents surface">
    <div className="subagentsStatsGrid">
      <Stat label="Tokens today" value={formatTokens(stats?.tokensToday)} unit={typeof stats?.tokensToday === 'number' ? 'tokens' : undefined} hint={typeof stats?.tokensToday === 'number' ? 'from snapshot' : undefined} tooltip={typeof stats?.tokensToday === 'number' ? undefined : unavailable} />
      <Stat label="Cost today ($)" value={formatCost(stats?.costToday)} hint="since local midnight" tooltip={typeof stats?.costToday === 'number' ? 'Sourced from server-derived snapshot. Updated on build.' : unavailable} />
      <Stat label="Active runs" value={typeof stats?.activeRuns === 'number' ? stats.activeRuns : '--'} hint="profiles currently running" tooltip={stats ? undefined : unavailable} />
      <Stat label="Last wrapper sync" value={relativeTime(stats?.lastWrapperSyncAt)} hint="wrapper availability" tooltip={stats?.lastWrapperSyncAt ? undefined : unavailable} />
    </div>
    <Panel title="Profiles, wrappers, skills, and mission footprint" eyebrow="Subagents" actions={<strong className="subagentDashboardCount">{filtered.length}/{rows.length}</strong>}>
      <div className="subagentFilters" role="search" aria-label="Filter subagents">
        <label><span>Search by name</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="clix, beru, kaisel…" /></label>
        <label><span>Role / label</span><select value={role} onChange={event => setRole(event.target.value)}>{roles.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Wrapper</span><select value={wrapperFilter} onChange={event => setWrapper(event.target.value as WrapperFilter)} data-wrapper-filter><option value="all">All wrappers</option><option value="available">Available</option><option value="busy">Busy / missing</option></select></label>
      </div>
    </Panel>
    <div className="subagentGrid" data-subagent-count={filtered.length}>
      {filtered.length === 0 ? <EmptyState title="No profiles match" description="Try clearing the filter" action={{ label: 'Clear filter', onClick: clearFilters }} /> : filtered.map(row => <Panel as="article" key={row.name} title={row.name} eyebrow={row.role} actions={<StatusPill tone={wrapperTone(row)} label={row.wrapperAvailable === null ? 'unknown' : row.wrapperAvailable ? 'available' : 'unavailable'} />}><dl className="subagentStats"><div><dt>Wrapper</dt><dd>{row.wrapper}</dd></div><div><dt>Skills</dt><dd>{row.skillCount}</dd></div><div><dt>Recent missions</dt><dd>{row.missionCount}</dd></div></dl></Panel>)}
    </div>
  </section>;
}
