import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

async function setupDesk() {
  const owner = await createUser('Agent');
  const workspace = await createWorkspaceWithMember(owner);
  const api = caller(owner);
  const desk = await api.servicedesk.desks.create({ workspaceId: workspace.id, name: 'IT Support' });
  const type = await api.servicedesk.requestTypes.create({
    serviceDeskId: desk.id,
    name: 'Get IT help',
  });
  return { owner, workspace, api, desk, type };
}

describe('servicedesk authorization', () => {
  it('requires auth to list desks', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(null).servicedesk.desks.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from viewing a queue', async () => {
    const outsider = await createUser('Outsider');
    const { desk } = await setupDesk();
    await expect(
      caller(outsider).servicedesk.requests.queue({ serviceDeskId: desk.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('servicedesk behaviour', () => {
  it('submits a request and lists it in the queue', async () => {
    const { api, type, desk } = await setupDesk();
    const request = await api.servicedesk.requests.create({
      requestTypeId: type.id,
      summary: 'Laptop will not boot',
      description: 'Black screen on startup.',
      priority: 'HIGH',
    });
    expect(request.status).toBe('OPEN');
    expect(request.requestType.name).toBe('Get IT help');

    const queue = await api.servicedesk.requests.queue({ serviceDeskId: desk.id });
    expect(queue).toHaveLength(1);

    const openOnly = await api.servicedesk.requests.queue({
      serviceDeskId: desk.id,
      status: 'RESOLVED',
    });
    expect(openOnly).toHaveLength(0);
  });

  it('transitions status, assigns and comments on a request', async () => {
    const { api, owner, type } = await setupDesk();
    const request = await api.servicedesk.requests.create({
      requestTypeId: type.id,
      summary: 'Reset my password',
      priority: 'MEDIUM',
    });

    const inProgress = await api.servicedesk.requests.setStatus({
      requestId: request.id,
      status: 'IN_PROGRESS',
    });
    expect(inProgress.status).toBe('IN_PROGRESS');

    const assigned = await api.servicedesk.requests.assign({
      requestId: request.id,
      assigneeId: owner.id,
    });
    expect(assigned.assignee?.id).toBe(owner.id);

    await api.servicedesk.requests.comment({ requestId: request.id, body: 'On it!' });
    const detail = await api.servicedesk.requests.get({ requestId: request.id });
    expect(detail.comments).toHaveLength(1);
    expect(detail.comments[0]!.body).toBe('On it!');
  });

  it('rejects assigning to a non-member', async () => {
    const { api, type } = await setupDesk();
    const outsider = await createUser('Outsider');
    const request = await api.servicedesk.requests.create({
      requestTypeId: type.id,
      summary: 'VPN access',
      priority: 'LOW',
    });
    await expect(
      api.servicedesk.requests.assign({ requestId: request.id, assigneeId: outsider.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
