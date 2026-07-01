import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

describe('confluence authorization', () => {
  it('requires authentication to list spaces', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);

    await expect(
      caller(null).confluence.spaces.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('forbids a non-member from listing spaces', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);

    await expect(
      caller(outsider).confluence.spaces.list({ workspaceId: workspace.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('forbids a non-member from reading a page tree', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    const space = await caller(owner).confluence.spaces.create({
      workspaceId: workspace.id,
      key: 'ENG',
      name: 'Engineering',
    });

    await expect(
      caller(outsider).confluence.pages.tree({ spaceId: space.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('confluence spaces & pages', () => {
  it('creates spaces and rejects duplicate keys', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);

    const space = await api.confluence.spaces.create({
      workspaceId: workspace.id,
      key: 'docs',
      name: 'Docs',
    });
    expect(space.key).toBe('DOCS'); // key uppercased by schema

    const spaces = await api.confluence.spaces.list({ workspaceId: workspace.id });
    expect(spaces).toHaveLength(1);

    await expect(
      api.confluence.spaces.create({ workspaceId: workspace.id, key: 'docs', name: 'Dupe' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('creates pages, nests children and builds the tree', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);
    const space = await api.confluence.spaces.create({
      workspaceId: workspace.id,
      key: 'HB',
      name: 'Handbook',
    });

    const root = await api.confluence.pages.create({
      spaceId: space.id,
      title: 'Welcome',
      body: '# Welcome\nHello team.',
    });
    expect(root.parentId).toBeNull();
    expect(root.author.id).toBe(owner.id);

    const child = await api.confluence.pages.create({
      spaceId: space.id,
      parentId: root.id,
      title: 'Onboarding',
    });
    expect(child.parentId).toBe(root.id);

    const tree = await api.confluence.pages.tree({ spaceId: space.id });
    expect(tree.map((p) => p.title).sort()).toEqual(['Onboarding', 'Welcome']);

    const fetched = await api.confluence.pages.get({ pageId: root.id });
    expect(fetched.body).toContain('Hello team.');
  });

  it('updates and deletes a page', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);
    const space = await api.confluence.spaces.create({
      workspaceId: workspace.id,
      key: 'RUN',
      name: 'Runbooks',
    });
    const page = await api.confluence.pages.create({ spaceId: space.id, title: 'Draft' });

    const updated = await api.confluence.pages.update({ pageId: page.id, title: 'Published' });
    expect(updated.title).toBe('Published');

    await api.confluence.pages.delete({ pageId: page.id });
    const tree = await api.confluence.pages.tree({ spaceId: space.id });
    expect(tree).toHaveLength(0);
  });

  it('rejects a parent page from another space', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const api = caller(owner);
    const a = await api.confluence.spaces.create({ workspaceId: workspace.id, key: 'AAA', name: 'A' });
    const b = await api.confluence.spaces.create({ workspaceId: workspace.id, key: 'BBB', name: 'B' });
    const pageInA = await api.confluence.pages.create({ spaceId: a.id, title: 'In A' });

    await expect(
      api.confluence.pages.create({ spaceId: b.id, parentId: pageInA.id, title: 'Bad' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
