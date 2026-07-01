import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

describe('compass authorization', () => {
  it('requires auth to list components', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(null).compass.components.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from creating a component', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(outsider).compass.components.create({ workspaceId: workspace.id, name: 'svc', type: 'SERVICE' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('compass behaviour', () => {
  it('creates, lists (filtered by type) and updates components', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);

    await api.compass.components.create({
      workspaceId: workspace.id,
      name: 'checkout-service',
      type: 'SERVICE',
      ownerTeam: 'Payments',
      tier: 1,
      healthScore: 72,
    });
    await api.compass.components.create({
      workspaceId: workspace.id,
      name: 'ui-kit',
      type: 'LIBRARY',
      tier: 3,
      healthScore: 95,
    });

    const all = await api.compass.components.list({ workspaceId: workspace.id });
    expect(all).toHaveLength(2);

    const services = await api.compass.components.list({
      workspaceId: workspace.id,
      type: 'SERVICE',
    });
    expect(services).toHaveLength(1);
    expect(services[0]!.name).toBe('checkout-service');
    expect(services[0]!.tier).toBe(1);

    const updated = await api.compass.components.update({
      componentId: services[0]!.id,
      healthScore: 88,
    });
    expect(updated.healthScore).toBe(88);
  });
});
