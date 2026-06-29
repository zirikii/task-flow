import { describe, expect, it } from 'vitest';
import {
  caller,
  createProject,
  createUser,
  createWorkspaceWithMember,
} from '../../test/helpers';

describe('task authorization', () => {
  it('forbids a non-member from reading a project board', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    const project = await createProject(workspace.id);

    await expect(caller(outsider).task.board({ projectId: project.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('forbids a non-member from creating a task', async () => {
    const owner = await createUser('Owner');
    const outsider = await createUser('Outsider');
    const workspace = await createWorkspaceWithMember(owner);
    const project = await createProject(workspace.id);

    await expect(
      caller(outsider).task.create({
        projectId: project.id,
        title: 'Hack',
        status: 'TODO',
        priority: 'NONE',
        labelIds: [],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('requires authentication', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const project = await createProject(workspace.id);

    await expect(caller(null).task.board({ projectId: project.id })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('task router behaviour', () => {
  it('creates tasks and groups them by status on the board', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const project = await createProject(workspace.id);
    const api = caller(owner);

    await api.task.create({
      projectId: project.id,
      title: 'Backlog item',
      status: 'BACKLOG',
      priority: 'LOW',
      labelIds: [],
    });
    await api.task.create({
      projectId: project.id,
      title: 'Todo item',
      status: 'TODO',
      priority: 'HIGH',
      labelIds: [],
    });

    const board = await api.task.board({ projectId: project.id });
    const backlog = board.columns.find((column) => column.status === 'BACKLOG');
    const todo = board.columns.find((column) => column.status === 'TODO');

    expect(backlog?.tasks.map((task) => task.title)).toEqual(['Backlog item']);
    expect(todo?.tasks.map((task) => task.title)).toEqual(['Todo item']);
  });

  it('moves a task to a new column and records an activity', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const project = await createProject(workspace.id);
    const api = caller(owner);

    const task = await api.task.create({
      projectId: project.id,
      title: 'Movable',
      status: 'TODO',
      priority: 'NONE',
      labelIds: [],
    });

    const moved = await api.task.move({
      taskId: task.id,
      status: 'DONE',
      beforeId: null,
      afterId: null,
    });

    expect(moved.status).toBe('DONE');

    const detail = await api.task.byId({ taskId: task.id });
    const types = detail.activities.map((activity) => activity.type);
    expect(types).toContain('TASK_CREATED');
    expect(types).toContain('TASK_MOVED');

    const board = await api.task.board({ projectId: project.id });
    const done = board.columns.find((column) => column.status === 'DONE');
    expect(done?.tasks.map((t) => t.id)).toEqual([task.id]);
  });

  it('orders tasks within a column by position when moving between neighbours', async () => {
    const owner = await createUser('Owner');
    const workspace = await createWorkspaceWithMember(owner);
    const project = await createProject(workspace.id);
    const api = caller(owner);

    const a = await api.task.create({
      projectId: project.id,
      title: 'A',
      status: 'TODO',
      priority: 'NONE',
      labelIds: [],
    });
    const b = await api.task.create({
      projectId: project.id,
      title: 'B',
      status: 'TODO',
      priority: 'NONE',
      labelIds: [],
    });
    const c = await api.task.create({
      projectId: project.id,
      title: 'C',
      status: 'TODO',
      priority: 'NONE',
      labelIds: [],
    });

    // Move C between A and B.
    await api.task.move({ taskId: c.id, status: 'TODO', beforeId: a.id, afterId: b.id });

    const board = await api.task.board({ projectId: project.id });
    const todo = board.columns.find((column) => column.status === 'TODO');
    expect(todo?.tasks.map((task) => task.title)).toEqual(['A', 'C', 'B']);
  });
});
