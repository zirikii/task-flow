import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';
import { db } from '@taskflow/db';

describe('atlas authorization', () => {
  it('requires auth to list teams', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(caller(null).atlas.teams.list({ workspaceId: workspace.id })).rejects.toMatchObject(
      { code: 'UNAUTHORIZED' },
    );
  });

  it('forbids a non-member from listing projects', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(outsider).atlas.projects.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('atlas behaviour', () => {
  it('creates teams (creator auto-joins) and adds members', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const teammate = await createUser('Teammate');
    await db.membership.create({
      data: { userId: teammate.id, workspaceId: workspace.id, role: 'MEMBER' },
    });
    const api = caller(owner);

    const team = await api.atlas.teams.create({ workspaceId: workspace.id, name: 'Platform' });
    expect(team.members.map((m) => m.id)).toEqual([owner.id]);

    const withMember = await api.atlas.teams.addMember({ teamId: team.id, userId: teammate.id });
    expect(withMember.members).toHaveLength(2);
  });

  it('creates a project and posts updates that change its status', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);
    const team = await api.atlas.teams.create({ workspaceId: workspace.id, name: 'Growth' });

    const project = await api.atlas.projects.create({
      workspaceId: workspace.id,
      name: 'Q3 Activation',
      teamId: team.id,
      status: 'ON_TRACK',
    });
    expect(project.status).toBe('ON_TRACK');
    expect(project.teamName).toBe('Growth');
    expect(project.owner.id).toBe(owner.id);

    const updated = await api.atlas.projects.postUpdate({
      atlasProjectId: project.id,
      status: 'AT_RISK',
      body: 'Slipping on the onboarding revamp; pulling in help.',
    });
    expect(updated.status).toBe('AT_RISK');
    expect(updated.updates).toHaveLength(1);

    const list = await api.atlas.projects.list({ workspaceId: workspace.id });
    expect(list[0]!.status).toBe('AT_RISK');
  });

  it('rejects adding a non-member to a team', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);
    const team = await api.atlas.teams.create({ workspaceId: workspace.id, name: 'Ops' });
    await expect(
      api.atlas.teams.addMember({ teamId: team.id, userId: outsider.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
