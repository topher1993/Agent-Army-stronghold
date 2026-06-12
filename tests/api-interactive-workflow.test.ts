import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';

const file = 'data/change-requests.json';
let original = '[]\n';

describe('Phase 3.5 interactive backend workflow', () => {
  beforeEach(() => { original = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '[]\n'; fs.writeFileSync(file, '[]\n', 'utf8'); });
  afterEach(() => { fs.writeFileSync(file, original, 'utf8'); });

  it('persists change requests and allows approve/apply by id', async () => {
    const server = createStrongholdServer();
    const created = await server.inject({ method: 'POST', url: '/api/change-requests', body: { kind: 'mission.create', title: 'Interactive mission', rationale: 'prove UI can create proposals', requestedBy: 'Chris', payload: { title: 'Interactive mission', summary: 'Created from UI', owner: 'Igris', priority: 'medium', specialists: ['Clix'] } } });
    expect(created.statusCode).toBe(201);
    const request = JSON.parse(created.body);
    const listed = JSON.parse((await server.inject({ method: 'GET', url: '/api/change-requests' })).body);
    expect(listed.some((item: { id: string }) => item.id === request.id)).toBe(true);
    const approved = JSON.parse((await server.inject({ method: 'POST', url: `/api/change-requests/${request.id}/approve`, body: { actor: 'Igris', reason: 'approved in UI' } })).body);
    expect(approved.status).toBe('approved');
    const applied = JSON.parse((await server.inject({ method: 'POST', url: `/api/change-requests/${request.id}/apply`, body: { actor: 'Igris' } })).body);
    expect(applied.status).toBe('applied');
  });
});
