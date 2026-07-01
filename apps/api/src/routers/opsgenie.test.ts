import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

describe('opsgenie authorization', () => {
  it('requires auth to list alerts', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(null).opsgenie.alerts.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from creating an alert', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(outsider).opsgenie.alerts.create({ workspaceId: workspace.id, message: 'boom', priority: 'P1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('opsgenie behaviour', () => {
  it('creates, acknowledges and closes alerts', async () => {
    const owner = await createUser('Responder');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);

    const alert = await api.opsgenie.alerts.create({
      workspaceId: workspace.id,
      message: 'CPU > 90% on web-1',
      priority: 'P2',
    });
    expect(alert.status).toBe('OPEN');

    const acked = await api.opsgenie.alerts.ack({ alertId: alert.id });
    expect(acked.status).toBe('ACKED');
    expect(acked.ackedBy?.id).toBe(owner.id);

    const closed = await api.opsgenie.alerts.close({ alertId: alert.id });
    expect(closed.status).toBe('CLOSED');

    const open = await api.opsgenie.alerts.list({ workspaceId: workspace.id, status: 'OPEN' });
    expect(open).toHaveLength(0);
  });

  it('builds an on-call schedule and resolves who is on call now', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);

    const schedule = await api.opsgenie.schedules.create({
      workspaceId: workspace.id,
      name: 'Primary',
    });
    expect(schedule.currentOnCall).toBeNull();

    const now = Date.now();
    const withShift = await api.opsgenie.schedules.addShift({
      scheduleId: schedule.id,
      userId: owner.id,
      startsAt: new Date(now - 60_000),
      endsAt: new Date(now + 60 * 60_000),
    });
    expect(withShift.currentOnCall?.id).toBe(owner.id);
    expect(withShift.shifts).toHaveLength(1);
  });

  it('rejects a shift for a non-member', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);
    const schedule = await api.opsgenie.schedules.create({ workspaceId: workspace.id, name: 'S' });
    await expect(
      api.opsgenie.schedules.addShift({
        scheduleId: schedule.id,
        userId: outsider.id,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 1000),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
