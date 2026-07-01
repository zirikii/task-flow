import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';
import { db } from '@taskflow/db';

async function setupBoard() {
  const owner = await createUser('PM');
  const workspace = await createWorkspaceWithMember(owner);
  const api = caller(owner);
  const board = await api.discovery.boards.create({ workspaceId: workspace.id, name: 'Roadmap ideas' });
  return { owner, workspace, api, board };
}

describe('discovery authorization', () => {
  it('requires auth to list boards', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(null).discovery.boards.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from listing ideas', async () => {
    const outsider = await createUser('Outsider');
    const { board } = await setupBoard();
    await expect(caller(outsider).discovery.ideas.list({ boardId: board.id })).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
  });
});

describe('discovery behaviour', () => {
  it('creates ideas and toggles votes', async () => {
    const { owner, workspace, api, board } = await setupBoard();
    const voter = await createUser('Voter');
    await db.membership.create({ data: { userId: voter.id, workspaceId: workspace.id, role: 'MEMBER' } });

    const idea = await api.discovery.ideas.create({
      boardId: board.id,
      title: 'Dark mode',
      impact: 4,
      effort: 2,
    });
    expect(idea.votes).toBe(0);
    expect(idea.hasVoted).toBe(false);
    expect(idea.creator.id).toBe(owner.id);

    const voted = await api.discovery.ideas.vote({ ideaId: idea.id });
    expect(voted.votes).toBe(1);
    expect(voted.hasVoted).toBe(true);

    // Voting again is idempotent.
    const votedAgain = await api.discovery.ideas.vote({ ideaId: idea.id });
    expect(votedAgain.votes).toBe(1);

    // A second member's vote increments the count.
    const asVoter = caller(voter);
    const twoVotes = await asVoter.discovery.ideas.vote({ ideaId: idea.id });
    expect(twoVotes.votes).toBe(2);
    expect(twoVotes.hasVoted).toBe(true);

    const unvoted = await api.discovery.ideas.unvote({ ideaId: idea.id });
    expect(unvoted.votes).toBe(1);
    expect(unvoted.hasVoted).toBe(false);
  });

  it('updates impact/effort and status', async () => {
    const { api, board } = await setupBoard();
    const idea = await api.discovery.ideas.create({ boardId: board.id, title: 'SSO' });
    const updated = await api.discovery.ideas.update({
      ideaId: idea.id,
      impact: 5,
      effort: 4,
      status: 'PLANNED',
    });
    expect(updated.impact).toBe(5);
    expect(updated.effort).toBe(4);
    expect(updated.status).toBe('PLANNED');
  });
});
