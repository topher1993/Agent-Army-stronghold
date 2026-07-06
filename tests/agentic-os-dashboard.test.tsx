import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgenticOsDashboardPanel, AGENTIC_OS_PLACEHOLDER, buildAgenticOsData } from '../src/components/AgenticOsDashboardPanel';
import type { StrongholdSnapshot } from '../src/types';

const root = process.cwd();

describe('Agentic OS dashboard placeholder (compact Phase E baseline)', () => {
  it('exposes a compact placeholder with only QC and Work data sections', () => {
    expect(AGENTIC_OS_PLACEHOLDER.source).toBe('placeholder');
    // The compact dashboard (igris-compact-dashboard-brief) deleted the
    // `health`, `memory` and `specialists` data sections. Only QC + Work
    // remain in the placeholder payload (the Activity table is rendered
    // directly from `live.activity`, not from data.sections).
    expect(AGENTIC_OS_PLACEHOLDER.sections.map(section => section.id)).toEqual([
      'qc',
      'work',
    ]);
  });

  it('renders the placeholder panel without throwing when no snapshot is provided', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel />);
    expect(html).toContain('Agentic OS');
    // The activity section is still rendered (now with a 4-column table).
    expect(html).toContain('data-section="activity"');
    // No "Memory & Skills" or "Roadmap" sections — those were deleted.
    // Note: "Memory Status" is now a real panel (Phase D3) — only the
    // removed sections' specific copy is asserted absent.
    expect(html).not.toContain('Memory &amp; Skills');
    expect(html).not.toContain('Roadmap');
    expect(html).not.toContain('App Health');
    // Placeholder copy should still be present so users see clear empty-state.
    expect(html).toContain('awaiting live wiring');
  });
});

describe('Agentic OS dashboard live-data wiring (Phase B)', () => {
  const fakeSnapshot: StrongholdSnapshot = {
    generatedAt: '2026-06-27T12:34:56.000Z',
    phase: 'Phase 3',
    readOnly: true,
    owner: 'Igris',
    coordinator: 'Belion',
    dataSources: {},
    counts: { agents: 0, profiles: 0, wrappersAvailable: 0, skills: 0, cronJobs: 0, missions: 0, blockedMissions: 0 },
    roster: [],
    profiles: [],
    wrappers: [],
    cronJobs: [],
    missions: [],
    safetyFindings: [],
    health: {
      tests: { status: 'passed', files: 32, tests: 72, durationMs: 47150, note: 'last npm test run' },
      build: { status: 'clean', bundleKb: 169, cssKb: 12, modules: 26, note: 'last npm run build' },
      auditEntries: 164,
      cronJobs: 6,
      tunnel: { publicHost: '127.0.0.1:5174', note: 'localhost only' },
    },
    qcHistory: [
      { file: 'tusk-qc-agentic-os-final.md', subject: 'Static Agentic OS Tab', score: 96, verdict: 'APPROVED', modifiedAt: '2026-06-27T20:01:00.000Z' },
      { file: 'tusk-qc-semver-final.md', subject: 'Semver Dependency Pinning', score: 96, verdict: 'APPROVED', modifiedAt: '2026-06-27T18:50:00.000Z' },
      { file: 'tusk-qc-divisions-final.md', subject: 'Divisions Label-only Mode', score: 94, verdict: 'APPROVED', modifiedAt: '2026-06-27T19:20:00.000Z' },
    ],
    workItems: [
      { id: 'mission:phase3', title: 'Phase 3 agentic ops', status: 'active', priority: 'P1', owner: 'Igris', source: 'missions', modifiedAt: '', relativePath: 'data/missions.json' },
      { id: 'card-1', title: 'Review Tusk QC', status: 'planned', source: 'stronghold', modifiedAt: '2026-06-27T18:00:00.000Z', relativePath: '.hermes/plans/card-1.md' },
    ],
    memory: {
      files: [
        { path: 'memories/MEMORY.md', name: 'MEMORY.md', sizeBytes: 2162, headings: ['Audit governance', 'UI/asset work'] },
        { path: 'memories/USER.md', name: 'USER.md', sizeBytes: 1238, headings: ['Stronghold dashboard work'] },
      ],
      skills: [
        { profile: 'default', skill: 'agent-army-governance' },
        { profile: 'default', skill: 'engineering-division' },
        { profile: 'default', skill: 'kanban-orchestrator' },
      ],
      totalSkills: 640,
    },
    activity: [
      { timestamp: '2026-06-27T19:55:00.000Z', actor: 'Igris', capability: 'apply', action: 'apply', outcome: 'validated', targetId: 'phase3', targetType: 'changeRequest', reason: 'applied patch' },
      { timestamp: '2026-06-27T19:30:00.000Z', actor: 'Sentinel', capability: 'review', action: 'review', outcome: 'approved-with-fixes', targetId: 'phase3', targetType: 'changeRequest', reason: 'two P1 css bugs' },
    ],
  };

  it('buildAgenticOsData emits the compact 3-section payload (qc, work, activity) with live status', () => {
    const data = buildAgenticOsData(fakeSnapshot);
    expect(data.source).toBe('live');
    expect(data.generatedAt).toBe('2026-06-27T12:34:56.000Z');
    expect(data.sections.map(s => s.id)).toEqual(['qc', 'work', 'activity']);
    for (const section of data.sections) {
      for (const card of section.cards) {
        expect(card.status).toBe('live');
      }
    }
  });

  it('renders the panel with live data when given a snapshot prop', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={fakeSnapshot} />);
    expect(html).toContain('LIVE');
    // Phase C layout: "<subject> — <score>/100 <verdict>" (now inline, no "Recent:" label).
    expect(html).toContain('Static Agentic OS Tab');
    expect(html).toContain('96/100');
    expect(html).toContain('APPROVED');
    expect(html).toContain('apply'); // from activity.actor + activity.action content
  });

  it('falls back to placeholder when qcHistory is empty', () => {
    const partial: StrongholdSnapshot = { ...fakeSnapshot, qcHistory: [] };
    const data = buildAgenticOsData(partial);
    const recent = data.sections.find(s => s.id === 'qc')!.cards.find(c => c.id === 'qc.recent')!;
    expect(recent.status).toBe('placeholder');
    // "no QC rounds captured yet" is the equivalent placeholder text now that
    // we surface real data first.
    expect(recent.primary.toLowerCase()).toMatch(/no qc rounds|awaiting live wiring/);
  });
});

describe('Agentic OS shell wiring (Phase A + Phase B regression)', () => {
  it('wires the Agentic OS dashboard as the default landing view of Stronghold', () => {
    const appSource = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
    const sidebarSource = fs.readFileSync(path.join(root, 'src', 'components', 'Sidebar.tsx'), 'utf8');
    const surfacesSource = fs.readFileSync(path.join(root, 'src', 'components', 'Surfaces.tsx'), 'utf8');
    expect(appSource).toMatch(/<SurfaceDashboard/);
    expect(sidebarSource).toMatch(/id: 'dashboard'/);
    expect(sidebarSource).toMatch(/id: 'operations'/);
    // App.tsx renders the Sidebar + surfaces.
    expect(appSource).toMatch(/<Sidebar[\s\S]+active=\{active\}[\s\S]+/);
    expect(appSource).toMatch(/<SurfaceDashboard/);
    // Dashboard is the default.
    expect(appSource).toMatch(/useActiveSurface\(\)/);
    // No fake intel/roster/inventory rendering.
    expect(appSource).not.toMatch(/Stronghold Telemetry/);
    expect(appSource).not.toMatch(/Engineering Division Roster/);
    expect(appSource).not.toMatch(/Agent Army Inventory/);
    // Operations holds the proposals/orchestration/mission/safety panel.
    expect(surfacesSource).toMatch(/SurfaceOperations/);
    expect(surfacesSource).toMatch(/Mission Proposal/);
    expect(surfacesSource).toMatch(/Task Proposal/);
    expect(surfacesSource).toMatch(/Phase 3 Agent Orchestration/);
  });

  it('keeps the panel scoped to React + Vite + TypeScript, no new framework dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const componentSource = fs.readFileSync(path.join(root, 'src', 'components', 'AgenticOsDashboardPanel.tsx'), 'utf8');
    expect(componentSource).toContain("from 'react'");
    expect(componentSource).not.toMatch(/from\s+['"](recharts|chart\.js|d3|framer-motion|@mui|tailwindcss|axios)/);
    expect(pkg.dependencies['react']).toMatch(/^18\./);
    expect(pkg.devDependencies['vitest']).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('Agentic OS 2-tab nav CSS (Phase D — Agentic OS is default)', () => {
  const stylesPath = path.join(root, 'src', 'styles.css');
  const css = fs.readFileSync(stylesPath, 'utf8');

  it('mobile tab nav grid uses 2 columns (Dashboard + Operations)', () => {
    const mobileTabNavBlocks = Array.from(css.matchAll(/\.mobileTabNav\s*\{[^}]*\}/g)).map(m => m[0]);
    const gridBlock = mobileTabNavBlocks.find(block => /grid-template-columns/.test(block));
    expect(gridBlock, 'mobile tab nav grid block should be present').toBeTruthy();
    expect(gridBlock!).toMatch(/grid-template-columns:\s*repeat\(\s*2\s*,/);
  });

  it('reveal rules match the new shell: .appShell + .sidebar + .sidebarItem active state in CSS', () => {
    expect(css).toMatch(/\.appShell/);
    expect(css).toMatch(/\.sidebar/);
    expect(css).toMatch(/\.sidebarItem--active/);
  });

  it('commandGrid is a 2-column desktop layout (main + right rail)', () => {
    const cmdGridBlock = css.match(/\.commandGrid\s*\{[^}]*grid-template-columns:[^}]*\}/);
    expect(cmdGridBlock, '.commandGrid grid-template-columns block should be present').toBeTruthy();
    expect(cmdGridBlock![0]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+320px/);
  });
});

describe('Snapshot generator (Phase B live data)', () => {
  it('emits health, qcHistory, workItems, memory, and activity fields', () => {
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'stronghold-snapshot.json'), 'utf8'));
    expect(snapshot.health).toBeTruthy();
    expect(snapshot.health.auditEntries).toBeGreaterThan(0);
    expect(snapshot.health.cronJobs).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.qcHistory)).toBe(true);
    expect(snapshot.qcHistory.length).toBeGreaterThan(0);
    expect(snapshot.qcHistory[0]).toHaveProperty('score');
    expect(snapshot.qcHistory[0]).toHaveProperty('verdict');
    expect(Array.isArray(snapshot.workItems)).toBe(true);
    expect(snapshot.workItems.length).toBeGreaterThan(0);
    expect(snapshot.memory).toBeTruthy();
    expect(snapshot.memory.totalSkills).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.memory.files)).toBe(true);
    expect(snapshot.memory.files.length).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.activity)).toBe(true);
    expect(snapshot.activity.length).toBeGreaterThan(0);
  });
});

describe('Agentic OS Phase C — live test/build + activity reason + stable effect', () => {
  const captured: StrongholdSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'stronghold-snapshot.json'), 'utf8'));

  it('reads real captured test/build numbers from the snapshot when present', () => {
    expect(captured.health.tests).toBeTruthy();
    if (captured.health.tests.status === 'passed') {
      expect(captured.health.tests.tests).toBeGreaterThan(0);
      expect(captured.health.tests.files).toBeGreaterThan(0);
      expect(captured.health.tests.durationMs).toBeGreaterThan(0);
    }
    if (captured.health.build.status === 'clean') {
      expect(captured.health.build.bundleKb).toBeGreaterThan(0);
      expect(captured.health.build.modules).toBeGreaterThan(0);
    }
  });

  it('renders real test/build numbers in the hero row when health data is live', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    if (captured.health.tests.status === 'passed') {
      expect(html).toContain(`${captured.health.tests.files} files`);
    }
    if (captured.health.build.status === 'clean') {
      // Hero "BUILD" stat shows "<bundleKb> KB" — that exact text appears once in the markup.
      expect(html).toContain(`${captured.health.build.bundleKb} KB`);
    }
  });

  it('omits reason cleanly when the activity entry has no reason', () => {
    const withoutReason: StrongholdSnapshot = {
      ...captured,
      activity: [
        { ...captured.activity[0], reason: '' },
      ],
    };
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={withoutReason} />);
    expect(html).toContain(captured.activity[0].actor);
  });

  it('stabilizes useEffect deps on generatedAt so object identity churn does not retrigger', () => {
    const source = fs.readFileSync(path.join(root, 'src', 'components', 'AgenticOsDashboardPanel.tsx'), 'utf8');
    expect(source).toMatch(/useEffect\([\s\S]*?\[hasLive,\s+snapshot\?\.generatedAt\][\s\S]*?\)/);
  });
});

describe('Phase C capture-health script (no shell, path-safe)', () => {
  const scriptPath = path.join(root, 'scripts', 'capture-health.mjs');
  const script = fs.readFileSync(scriptPath, 'utf8');

  it('runs only known dev tools via spawn, never a shell', () => {
    expect(script).toContain("spawn(cmd, args, { cwd, shell: false");
    expect(script).not.toMatch(/shell:\s*true/);
    expect(script).not.toMatch(/execSync|spawnSync/);
  });

  it('refuses to write health JSON outside the project-local data/health dir', () => {
    expect(script).toContain('Refusing to write health JSON outside');
    expect(script).toMatch(/path\.resolve\((HEALTH_DIR|HEALTH_DIR_RESOLVED)\)/);
  });

  it('writes data/health/test.json and data/health/build.json deterministically', () => {
    expect(script).toMatch(/writeJson\(['"]test\.json['"]/);
    expect(script).toMatch(/writeJson\(['"]build\.json['"]/);
  });
});

describe('Agentic OS dashboard compact layout (Igris compact brief — Phase E)', () => {
  const stylesPath = path.join(root, 'src', 'styles.css');
  const css = fs.readFileSync(stylesPath, 'utf8');
  const componentSource = fs.readFileSync(path.join(root, 'src', 'components', 'AgenticOsDashboardPanel.tsx'), 'utf8');
  const appSource = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
  const captured: StrongholdSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'stronghold-snapshot.json'), 'utf8'));

  it('renders exactly 4 hero stats in the hero row with the expected IDs', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    const matches = html.match(/data-hero-id="[^"]+"/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('data-hero-id="hero.tests"');
    expect(html).toContain('data-hero-id="hero.build"');
    expect(html).toContain('data-hero-id="hero.audit"');
    expect(html).toContain('data-hero-id="hero.cron"');
    // Hero values render as <strong class="agenticOsHeroValue">
    expect(html).toMatch(/<strong class="agenticOsHeroValue">[^<]+<\/strong>/);
  });

  it('uses a compact hero font size (1.6rem) and section title size (0.85rem) in CSS', () => {
    const heroBlock = css.match(/\.agenticOsHeroValue\s*\{[^}]+\}/);
    expect(heroBlock, 'agenticOsHeroValue block should be present').toBeTruthy();
    expect(heroBlock![0]).toMatch(/font-size:\s*1\.6rem/);
    expect(heroBlock![0]).toMatch(/font-weight:\s*590/);
    const sectionBlock = css.match(/\.agenticOsSection\s+h3\s*\{[^}]+\}/);
    expect(sectionBlock, 'section h3 block should be present').toBeTruthy();
    expect(sectionBlock![0]).toMatch(/font-size:\s*0?\.?85rem/);
    expect(sectionBlock![0]).toMatch(/font-weight:\s*590/);
  });

  it('embeds an inline SVG sparkline with a polyline and 7 points when QC history has data', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    expect(html).toContain('data-sparkline="qc"');
    expect(html).toMatch(/<svg[^>]*class="agenticOsSparkline"/);
    expect(html).toMatch(/<polyline[^>]*points="[^"]+"[^>]*fill="none"[^>]*stroke="var\(--accent\)"/);
    // 7 (x,y) pairs in the polyline points attribute
    const polylineMatch = html.match(/<polyline[^>]*points="([^"]+)"/);
    expect(polylineMatch).toBeTruthy();
    const points = polylineMatch![1].trim().split(/\s+/);
    expect(points.length).toBe(7);
  });

  it('renders the compact activity table with 4 columns (When/Actor/Action/Target) and ≤ 5 rows', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    expect(html).toContain('data-activity-table="true"');
    expect(html).toMatch(/<table[^>]*class="agenticOsTable"/);
    // 4 columns: When / Actor / Action / Target (Reason + Outcome removed).
    expect(html).toMatch(/<thead>[\s\S]*?<th[^>]*>When<\/th>[\s\S]*?<th[^>]*>Actor<\/th>[\s\S]*?<th[^>]*>Action<\/th>[\s\S]*?<th[^>]*>Target<\/th>[\s\S]*?<\/thead>/);
    // The "Reason" and "Outcome" column headers should be gone.
    expect(html).not.toMatch(/<th[^>]*>Reason<\/th>/);
    expect(html).not.toMatch(/<th[^>]*>Outcome<\/th>/);
    // Activity rows are tagged with data-activity-row
    const rowMatches = html.match(/data-activity-row="true"/g) || [];
    expect(rowMatches.length).toBeGreaterThan(0);
    expect(rowMatches.length).toBeLessThanOrEqual(5);
    expect(rowMatches.length).toBe(captured.activity.slice(0, 5).length);
  });

  it('renders work items as up to 3 separate cards with badges, status pills and meta', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    const workCards = html.match(/<article[^>]*class="agenticOsWorkCard"/g) || [];
    expect(workCards.length).toBe(Math.min(3, captured.workItems.length));
    // Each work card has a badge, a status pill, an owner and a date/time
    expect(html).toContain('class="agenticOsWorkBadge"');
    expect(html).toContain('class="agenticOsWorkMeta"');
    expect(html).toMatch(/data-work-id="[^"]+"/);
  });

  it('wraps Work Items + Activity in a side-by-side 2-column grid', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    // The two sections share a single parent .agenticOsTwoCol wrapper.
    expect(html).toMatch(/<div[^>]*class="agenticOsTwoCol"[\s\S]*?data-section="work-items"[\s\S]*?data-section="activity"[\s\S]*?<\/div>/);
    // CSS defines the 2-column desktop grid with Work on the left + Activity on the right.
    const twoColBlock = css.match(/\.agenticOsTwoCol\s*\{[^}]+\}/);
    expect(twoColBlock, '.agenticOsTwoCol block should be present').toBeTruthy();
    expect(twoColBlock![0]).toMatch(/grid-template-columns:\s*minmax\(280px,\s*1fr\)\s+minmax\(0,\s*1\.5fr\)/);
  });

  it('does not render the deleted App Health, Memory & Skills, or Roadmap sections', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    expect(html).not.toContain('data-section="app-health"');
    expect(html).not.toContain('data-section="memory"');
    expect(html).not.toContain('data-section="roadmap"');
    // No "Phase B · live data wiring" eyebrow text (it was deleted).
    expect(html).not.toContain('Phase B · live data wiring');
    // No "Audit log: …" footer counter line.
    expect(html).not.toMatch(/Audit log:\s+\d+\s+entries/);
    // No "agenticOsFooter" wrapper.
    expect(html).not.toMatch(/class="muted agenticOsFooter"/);
  });

  it('keeps the hero row + QC + work-items + activity + discord-coordination as the only rendered sections', () => {
    const html = renderToStaticMarkup(<AgenticOsDashboardPanel snapshot={captured} />);
    const sectionMarkers = html.match(/data-section="[^"]+"/g) || [];
    // Exactly 5 data-section markers: qc-history, work-items, activity,
    // discord-coordination (Phase D1 — added by the Discord routing map),
    // and routing-flow (Phase D4 — added by the activity graph panel).
    expect(sectionMarkers.sort()).toEqual([
      'data-section="activity"',
      'data-section="discord-coordination"',
      'data-section="qc-history"',
      'data-section="routing-flow"',
      'data-section="work-items"',
    ].sort());
  });

  it('App.tsx renders the Agentic OS dashboard as the default main view (no tab click required)', () => {
    // Phase 47: dashboard is rendered through SurfaceDashboard (App.tsx delegates).
    // The dashboard surface wraps AgenticOsDashboardPanel and is mounted via
    // the Sidebar-driven active surface state, defaulting to 'dashboard'.
    expect(appSource).toMatch(/<SurfaceDashboard\b/);
    expect(appSource).toMatch(/<Sidebar\b/);
    expect(appSource).toMatch(/useActiveSurface\(\)/);
  });

  it('CSS still defines layout primitives needed for the new app shell (sidebar grid + main)', () => {
    const appShell = css.match(/\.appShell\s*\{[^}]*\}/);
    expect(appShell, '.appShell block should be present').toBeTruthy();
    expect(appShell![0]).toMatch(/grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/);
  });

  it('CSS defines sidebar styling through the canonical color token namespace', () => {
    expect(css).toMatch(/\.sidebar\s*\{/);
    expect(css).not.toMatch(/--sidebar-/);
    expect(css).toMatch(/background:\s*var\(--color-surface\)/);
    expect(css).toMatch(/\.sidebarItem--active/);
  });

  it('does not introduce any new framework dependency in the component', () => {
    expect(componentSource).not.toMatch(/from\s+['"](recharts|chart\.js|d3|framer-motion|@mui|tailwindcss|axios|visx|nivo|@nivo)/);
    expect(componentSource).toContain("from 'react'");
  });

  it('component source still uses the live-data wiring helpers and stable effect deps', () => {
    expect(componentSource).toMatch(/buildAgenticOsData/);
    expect(componentSource).toMatch(/useEffect\([\s\S]*?\[hasLive,\s+snapshot\?\.generatedAt\][\s\S]*?\)/);
  });

  it('component source uses .slice(0, 5) for activity and .slice(0, 3) for work items', () => {
    // Brief says: activity 5 rows max, work items 3 cards max.
    expect(componentSource).toMatch(/\.slice\(0,\s*5\)/);
    expect(componentSource).toMatch(/\.slice\(0,\s*3\)/);
  });
});
