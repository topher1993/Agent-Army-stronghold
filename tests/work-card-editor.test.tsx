import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkCardEditor } from '../src/components/WorkCardEditor';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = originalFetch;
});
afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('WorkCardEditor form', () => {
  it('renders all required fields with sensible defaults', () => {
    const html = renderToStaticMarkup(<WorkCardEditor />);
    // The disclosure carries the section title now; the editor itself
    // renders the prose description + labelled FormFields.
    expect(html).toMatch(/aria-label="Work card proposal form"/);
    expect(html).toMatch(/Submit a new work card as a proposal/);
    expect(html).toContain('Work card ID');
    expect(html).toContain('Project');
    expect(html).toContain('Title');
    expect(html).toContain('Owner');
    expect(html).toContain('QC');
    expect(html).toContain('Risk');
    expect(html).toContain('Status');
    expect(html).toContain('Schedule');
    expect(html).toContain('Mode');
    expect(html).toContain('Rationale');
    // Default owner is Igris, default qc is Tusk, default risk is YELLOW.
    expect(html).toContain('value="Igris"');
    expect(html).toContain('value="Tusk"');
    expect(html).toContain('value="YELLOW"');
  });

  it('submits a workcard.create change request via fetch', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      expect(url).toBe('http://127.0.0.1:5175/api/change-requests');
      expect(init?.method).toBe('POST');
      const body = JSON.parse(String(init?.body));
      expect(body.kind).toBe('workcard.create');
      expect(body.requestedBy).toBe('Chris');
      expect(body.reviewers).toContain('Igris');
      expect(body.reviewers).toContain('Sentinel');
      expect(body.payload.workCardId).toBe('WC-TEST-1');
      expect(body.payload.project).toBe('stronghold');
      expect(body.payload.title).toBe('Add telemetry wrapper');
      expect(body.payload.owner).toBe('Igris');
      expect(body.payload.qc).toBe('Tusk');
      expect(body.payload.risk).toBe('YELLOW');
      expect(body.payload.status).toBe('in_progress');
      expect(body.payload.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      return new Response(JSON.stringify({ id: 'cr_test_123', status: 'pending' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const onCreated = vi.fn();
    // Re-importing to keep test isolation; the component captures strongholdApi at module load.
    const { strongholdApi } = await import('../src/api/strongholdApi');
    const request = await strongholdApi.createChangeRequest({
      kind: 'workcard.create',
      title: 'Add telemetry wrapper',
      rationale: 'Phase 46 work',
      requestedBy: 'Chris',
      reviewers: ['Igris', 'Sentinel'],
      payload: {
        workCardId: 'WC-TEST-1',
        project: 'stronghold',
        title: 'Add telemetry wrapper',
        owner: 'Igris',
        qc: 'Tusk',
        risk: 'YELLOW',
        status: 'in_progress',
        created: new Date().toISOString().slice(0, 10),
      },
    });
    onCreated(request);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(request.id).toBe('cr_test_123');
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it('omits optional schedule/mode fields when blank', () => {
    const html = renderToStaticMarkup(<WorkCardEditor />);
    // No submitted state yet, so the status line should not appear.
    expect(html).not.toContain('statusLine');
    // The Schedule and Mode inputs render but are empty.
    expect(html).toMatch(/Schedule \(optional\)/);
    expect(html).toMatch(/Mode \(optional\)/);
  });
});