import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

async function setupPage() {
  const owner = await createUser('Owner');
  const workspace = await createWorkspaceWithMember(owner);
  const api = caller(owner);
  const page = await api.statuspage.pages.create({ workspaceId: workspace.id, name: 'Public Status' });
  return { owner, workspace, api, page };
}

describe('statuspage authorization', () => {
  it('requires auth to list pages', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(null).statuspage.pages.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from reading a page', async () => {
    const outsider = await createUser('Outsider');
    const { page } = await setupPage();
    await expect(caller(outsider).statuspage.pages.get({ pageId: page.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('statuspage behaviour', () => {
  it('adds components and flips their status', async () => {
    const { api, page } = await setupPage();
    const api1 = await api.statuspage.components.create({ pageId: page.id, name: 'API' });
    await api.statuspage.components.create({ pageId: page.id, name: 'Web' });

    const degraded = await api.statuspage.components.setStatus({
      componentId: api1.id,
      status: 'DEGRADED',
    });
    expect(degraded.status).toBe('DEGRADED');

    const detail = await api.statuspage.pages.get({ pageId: page.id });
    expect(detail.components.map((c) => c.name)).toEqual(['API', 'Web']);
    expect(detail.components.find((c) => c.name === 'API')!.status).toBe('DEGRADED');
  });

  it('opens an incident with an initial update and appends updates', async () => {
    const { api, page } = await setupPage();
    const incident = await api.statuspage.incidents.create({
      pageId: page.id,
      title: 'Elevated error rates',
      impact: 'MAJOR',
      status: 'INVESTIGATING',
      body: 'We are investigating elevated error rates.',
    });
    expect(incident.updates).toHaveLength(1);
    expect(incident.status).toBe('INVESTIGATING');

    const updated = await api.statuspage.incidents.addUpdate({
      incidentId: incident.id,
      status: 'RESOLVED',
      body: 'The issue has been resolved.',
    });
    expect(updated.status).toBe('RESOLVED');
    expect(updated.updates).toHaveLength(2);
    // Newest update first.
    expect(updated.updates[0]!.body).toBe('The issue has been resolved.');

    const detail = await api.statuspage.pages.get({ pageId: page.id });
    expect(detail.incidents).toHaveLength(1);
    expect(detail.incidents[0]!.status).toBe('RESOLVED');
  });
});
