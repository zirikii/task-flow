import type { Prisma } from '@taskflow/db';
import type {
  Activity,
  Comment,
  Label,
  Page,
  PageNode,
  Project,
  Space,
  Task,
  TrelloBoard,
  TrelloBoardDetail,
  TrelloCard,
  TrelloList,
  TaskDetail,
  UserRef,
  Workspace,
} from '@taskflow/types';
import type { Role } from '@taskflow/types';

// ---------------------------------------------------------------------------
// Prisma include shapes (reused by routers so queries match serializer inputs)
// ---------------------------------------------------------------------------

export const taskInclude = {
  assignee: true,
  creator: true,
  labels: { include: { label: true } },
} satisfies Prisma.TaskInclude;

export const taskDetailInclude = {
  ...taskInclude,
  comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
  activities: { include: { actor: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.TaskInclude;

export const commentInclude = { author: true } satisfies Prisma.CommentInclude;
export const activityInclude = { actor: true } satisfies Prisma.ActivityInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
type TaskDetailRow = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;
type CommentRow = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;
type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;
type LabelRow = Prisma.LabelGetPayload<true>;
type ProjectRow = Prisma.ProjectGetPayload<true>;
type WorkspaceRow = Prisma.WorkspaceGetPayload<true>;
type UserRow = Prisma.UserGetPayload<true>;

// ---------------------------------------------------------------------------
// Serializers: Prisma row → API DTO (matches @taskflow/types schemas)
// ---------------------------------------------------------------------------

export function toUserRef(user: Pick<UserRow, 'id' | 'name' | 'email'>): UserRef {
  return { id: user.id, name: user.name, email: user.email };
}

export function toLabel(label: LabelRow): Label {
  return { id: label.id, workspaceId: label.workspaceId, name: label.name, color: label.color };
}

export function toProject(project: ProjectRow): Project {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    key: project.key,
    description: project.description,
    createdAt: project.createdAt,
  };
}

export function toWorkspace(workspace: WorkspaceRow, role: Role): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role,
    createdAt: workspace.createdAt,
  };
}

export function toTask(task: TaskRow): Task {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    position: task.position,
    assignee: task.assignee ? toUserRef(task.assignee) : null,
    creator: toUserRef(task.creator),
    labels: task.labels.map((taskLabel) => toLabel(taskLabel.label)),
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function toComment(comment: CommentRow): Comment {
  return {
    id: comment.id,
    taskId: comment.taskId,
    body: comment.body,
    author: toUserRef(comment.author),
    createdAt: comment.createdAt,
  };
}

export function toActivity(activity: ActivityRow): Activity {
  return {
    id: activity.id,
    taskId: activity.taskId,
    type: activity.type,
    data: (activity.data ?? {}) as Record<string, unknown>,
    actor: toUserRef(activity.actor),
    createdAt: activity.createdAt,
  };
}

export function toTaskDetail(task: TaskDetailRow): TaskDetail {
  return {
    ...toTask(task),
    comments: task.comments.map(toComment),
    activities: task.activities.map(toActivity),
  };
}

// ---------------------------------------------------------------------------
// Confluence
// ---------------------------------------------------------------------------

type SpaceRow = Prisma.SpaceGetPayload<true>;
type PageRow = Prisma.PageGetPayload<{ include: { author: true } }>;

export function toSpace(space: SpaceRow): Space {
  return {
    id: space.id,
    workspaceId: space.workspaceId,
    key: space.key,
    name: space.name,
    description: space.description,
    createdAt: space.createdAt,
  };
}

export function toPageNode(page: Pick<PageRow, 'id' | 'spaceId' | 'parentId' | 'title' | 'position'>): PageNode {
  return {
    id: page.id,
    spaceId: page.spaceId,
    parentId: page.parentId,
    title: page.title,
    position: page.position,
  };
}

export function toPage(page: PageRow): Page {
  return {
    id: page.id,
    spaceId: page.spaceId,
    parentId: page.parentId,
    title: page.title,
    body: page.body,
    author: toUserRef(page.author),
    position: page.position,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Trello
// ---------------------------------------------------------------------------

type TrelloBoardRow = Prisma.TrelloBoardGetPayload<true>;
type TrelloCardRow = Prisma.TrelloCardGetPayload<true>;
type TrelloListRow = Prisma.TrelloListGetPayload<{ include: { cards: true } }>;
type TrelloBoardDetailRow = Prisma.TrelloBoardGetPayload<{
  include: { lists: { include: { cards: true } } };
}>;

export function toTrelloBoard(board: TrelloBoardRow): TrelloBoard {
  return {
    id: board.id,
    workspaceId: board.workspaceId,
    name: board.name,
    createdAt: board.createdAt,
  };
}

export function toTrelloCard(card: TrelloCardRow): TrelloCard {
  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    position: card.position,
    createdAt: card.createdAt,
  };
}

export function toTrelloList(list: TrelloListRow): TrelloList {
  return {
    id: list.id,
    boardId: list.boardId,
    name: list.name,
    position: list.position,
    cards: [...list.cards]
      .sort((a, b) => a.position - b.position)
      .map(toTrelloCard),
  };
}

export function toTrelloBoardDetail(board: TrelloBoardDetailRow): TrelloBoardDetail {
  return {
    id: board.id,
    workspaceId: board.workspaceId,
    name: board.name,
    lists: [...board.lists]
      .sort((a, b) => a.position - b.position)
      .map(toTrelloList),
  };
}
