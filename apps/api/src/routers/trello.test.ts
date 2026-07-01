import { describe, expect, it } from 'vitest';
import { caller, createUser, createWorkspaceWithMember } from '../../test/helpers';

async function setupBoard() {
  const owner = await createUser('Owner');
  const workspace = await createWorkspaceWithMember(owner);
  const api = caller(owner);
  const board = await api.trello.boards.create({ workspaceId: workspace.id, name: 'Roadmap' });
  return { owner, workspace, api, board };
}

describe('trello authorization', () => {
  it('requires auth to list boards', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    await expect(caller(null).trello.boards.list({ workspaceId: workspace.id })).rejects.toMatchObject(
      { code: 'UNAUTHORIZED' },
    );
  });

  it('forbids a non-member from reading a board', async () => {
    const outsider = await createUser('Outsider');
    const { board } = await setupBoard();
    await expect(caller(outsider).trello.boards.get({ boardId: board.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('forbids a non-member from adding a card', async () => {
    const outsider = await createUser('Outsider');
    const { api, board } = await setupBoard();
    const list = await api.trello.lists.create({ boardId: board.id, name: 'To do' });
    await expect(
      caller(outsider).trello.cards.create({ listId: list.id, title: 'Hack' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('trello board behaviour', () => {
  it('creates lists and cards and returns them ordered in the board', async () => {
    const { api, board } = await setupBoard();
    const todo = await api.trello.lists.create({ boardId: board.id, name: 'To do' });
    const doing = await api.trello.lists.create({ boardId: board.id, name: 'Doing' });

    await api.trello.cards.create({ listId: todo.id, title: 'First' });
    await api.trello.cards.create({ listId: todo.id, title: 'Second' });

    const detail = await api.trello.boards.get({ boardId: board.id });
    expect(detail.lists.map((l) => l.name)).toEqual(['To do', 'Doing']);
    expect(detail.lists[0]!.cards.map((c) => c.title)).toEqual(['First', 'Second']);
    expect(detail.lists[1]!.cards).toHaveLength(0);
    void doing;
  });

  it('moves a card to another list and reorders within a list', async () => {
    const { api, board } = await setupBoard();
    const todo = await api.trello.lists.create({ boardId: board.id, name: 'To do' });
    const done = await api.trello.lists.create({ boardId: board.id, name: 'Done' });

    const a = await api.trello.cards.create({ listId: todo.id, title: 'A' });
    const b = await api.trello.cards.create({ listId: todo.id, title: 'B' });
    const c = await api.trello.cards.create({ listId: todo.id, title: 'C' });

    // Move C to the top of "To do" (before A).
    await api.trello.cards.move({ cardId: c.id, toListId: todo.id, afterId: a.id });
    let detail = await api.trello.boards.get({ boardId: board.id });
    expect(detail.lists[0]!.cards.map((card) => card.title)).toEqual(['C', 'A', 'B']);

    // Move A to the Done list.
    await api.trello.cards.move({ cardId: a.id, toListId: done.id });
    detail = await api.trello.boards.get({ boardId: board.id });
    expect(detail.lists[0]!.cards.map((card) => card.title)).toEqual(['C', 'B']);
    expect(detail.lists[1]!.cards.map((card) => card.title)).toEqual(['A']);
    void b;
  });

  it('updates and deletes a card', async () => {
    const { api, board } = await setupBoard();
    const list = await api.trello.lists.create({ boardId: board.id, name: 'Ideas' });
    const card = await api.trello.cards.create({ listId: list.id, title: 'Rough' });

    const updated = await api.trello.cards.update({ cardId: card.id, title: 'Polished' });
    expect(updated.title).toBe('Polished');

    await api.trello.cards.delete({ cardId: card.id });
    const detail = await api.trello.boards.get({ boardId: board.id });
    expect(detail.lists[0]!.cards).toHaveLength(0);
  });
});
