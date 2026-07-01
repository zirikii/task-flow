import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

async function setupRepo() {
  const owner = await createUser('Dev');
  const workspace = await createWorkspaceWithMember(owner);
  const api = caller(owner);
  const repo = await api.bitbucket.repos.create({ workspaceId: workspace.id, name: 'web-app' });
  return { owner, workspace, api, repo };
}

describe('bitbucket authorization', () => {
  it('requires auth to list repos', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(
      caller(null).bitbucket.repos.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from listing pull requests', async () => {
    const outsider = await createUser('Outsider');
    const { repo } = await setupRepo();
    await expect(
      caller(outsider).bitbucket.pullRequests.list({ repositoryId: repo.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('bitbucket behaviour', () => {
  it('rejects duplicate repository names', async () => {
    const { api, workspace } = await setupRepo();
    await expect(
      api.bitbucket.repos.create({ workspaceId: workspace.id, name: 'web-app' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('numbers pull requests per repo, approves and merges', async () => {
    const { api, repo } = await setupRepo();
    const pr1 = await api.bitbucket.pullRequests.create({
      repositoryId: repo.id,
      title: 'Add login page',
      sourceBranch: 'feat/login',
    });
    const pr2 = await api.bitbucket.pullRequests.create({
      repositoryId: repo.id,
      title: 'Fix header',
      sourceBranch: 'fix/header',
    });
    expect(pr1.number).toBe(1);
    expect(pr2.number).toBe(2);

    const approved = await api.bitbucket.pullRequests.approve({ pullRequestId: pr1.id });
    expect(approved.approvals).toBe(1);
    expect(approved.hasApproved).toBe(true);

    await api.bitbucket.pullRequests.comment({ pullRequestId: pr1.id, body: 'LGTM 🚀' });
    const detail = await api.bitbucket.pullRequests.get({ pullRequestId: pr1.id });
    expect(detail.comments).toHaveLength(1);

    const merged = await api.bitbucket.pullRequests.merge({ pullRequestId: pr1.id });
    expect(merged.status).toBe('MERGED');

    // Merging again is rejected.
    await expect(
      api.bitbucket.pullRequests.merge({ pullRequestId: pr1.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const open = await api.bitbucket.pullRequests.list({ repositoryId: repo.id, status: 'OPEN' });
    expect(open.map((pr) => pr.id)).toEqual([pr2.id]);

    const repos = await api.bitbucket.repos.list({ workspaceId: repo.workspaceId });
    expect(repos[0]!.openPullRequests).toBe(1);
  });
});
