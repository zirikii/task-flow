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
  StatusComponent,
  StatusIncident,
  StatusPage,
  StatusPageDetail,
  IncidentUpdate,
  ServiceDesk,
  RequestType,
  RequestComment,
  ServiceRequest,
  ServiceRequestDetail,
  IdeaBoard,
  Idea,
  Alert,
  OnCallShift,
  OnCallSchedule,
  Component,
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

// ---------------------------------------------------------------------------
// Statuspage
// ---------------------------------------------------------------------------

type StatusPageRow = Prisma.StatusPageGetPayload<true>;
type StatusComponentRow = Prisma.StatusComponentGetPayload<true>;
type IncidentUpdateRow = Prisma.IncidentUpdateGetPayload<{ include: { author: true } }>;
type StatusIncidentRow = Prisma.StatusIncidentGetPayload<{
  include: { updates: { include: { author: true } } };
}>;
type StatusPageDetailRow = Prisma.StatusPageGetPayload<{
  include: {
    components: true;
    incidents: { include: { updates: { include: { author: true } } } };
  };
}>;

export function toStatusPage(page: StatusPageRow): StatusPage {
  return {
    id: page.id,
    workspaceId: page.workspaceId,
    name: page.name,
    createdAt: page.createdAt,
  };
}

export function toStatusComponent(component: StatusComponentRow): StatusComponent {
  return {
    id: component.id,
    pageId: component.pageId,
    name: component.name,
    status: component.status,
    position: component.position,
  };
}

export function toIncidentUpdate(update: IncidentUpdateRow): IncidentUpdate {
  return {
    id: update.id,
    incidentId: update.incidentId,
    body: update.body,
    status: update.status,
    author: toUserRef(update.author),
    createdAt: update.createdAt,
  };
}

export function toStatusIncident(incident: StatusIncidentRow): StatusIncident {
  return {
    id: incident.id,
    pageId: incident.pageId,
    title: incident.title,
    status: incident.status,
    impact: incident.impact,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    updates: [...incident.updates]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toIncidentUpdate),
  };
}

export function toStatusPageDetail(page: StatusPageDetailRow): StatusPageDetail {
  return {
    ...toStatusPage(page),
    components: [...page.components]
      .sort((a, b) => a.position - b.position)
      .map(toStatusComponent),
    incidents: [...page.incidents]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toStatusIncident),
  };
}

// ---------------------------------------------------------------------------
// Jira Service Management
// ---------------------------------------------------------------------------

type ServiceDeskRow = Prisma.ServiceDeskGetPayload<true>;
type RequestTypeRow = Prisma.RequestTypeGetPayload<true>;
type RequestCommentRow = Prisma.RequestCommentGetPayload<{ include: { author: true } }>;
const serviceRequestInclude = {
  requestType: true,
  reporter: true,
  assignee: true,
} satisfies Prisma.ServiceRequestInclude;
type ServiceRequestRow = Prisma.ServiceRequestGetPayload<{ include: typeof serviceRequestInclude }>;
type ServiceRequestDetailRow = Prisma.ServiceRequestGetPayload<{
  include: {
    requestType: true;
    reporter: true;
    assignee: true;
    comments: { include: { author: true } };
  };
}>;

export function toServiceDesk(desk: ServiceDeskRow): ServiceDesk {
  return { id: desk.id, workspaceId: desk.workspaceId, name: desk.name, createdAt: desk.createdAt };
}

export function toRequestType(type: RequestTypeRow): RequestType {
  return {
    id: type.id,
    serviceDeskId: type.serviceDeskId,
    name: type.name,
    description: type.description,
  };
}

export function toRequestComment(comment: RequestCommentRow): RequestComment {
  return {
    id: comment.id,
    requestId: comment.requestId,
    body: comment.body,
    author: toUserRef(comment.author),
    createdAt: comment.createdAt,
  };
}

export function toServiceRequest(request: ServiceRequestRow): ServiceRequest {
  return {
    id: request.id,
    serviceDeskId: request.serviceDeskId,
    requestType: toRequestType(request.requestType),
    summary: request.summary,
    description: request.description,
    status: request.status,
    priority: request.priority,
    reporter: toUserRef(request.reporter),
    assignee: request.assignee ? toUserRef(request.assignee) : null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function toServiceRequestDetail(request: ServiceRequestDetailRow): ServiceRequestDetail {
  return {
    ...toServiceRequest(request),
    comments: request.comments.map(toRequestComment),
  };
}

export { serviceRequestInclude };

// ---------------------------------------------------------------------------
// Jira Product Discovery
// ---------------------------------------------------------------------------

type IdeaBoardRow = Prisma.IdeaBoardGetPayload<true>;
export const ideaInclude = {
  creator: true,
  votes: { select: { userId: true } },
} satisfies Prisma.IdeaInclude;
type IdeaRow = Prisma.IdeaGetPayload<{ include: typeof ideaInclude }>;

export function toIdeaBoard(board: IdeaBoardRow): IdeaBoard {
  return {
    id: board.id,
    workspaceId: board.workspaceId,
    name: board.name,
    createdAt: board.createdAt,
  };
}

export function toIdea(idea: IdeaRow, currentUserId: string): Idea {
  return {
    id: idea.id,
    boardId: idea.boardId,
    title: idea.title,
    description: idea.description,
    impact: idea.impact,
    effort: idea.effort,
    status: idea.status,
    creator: toUserRef(idea.creator),
    votes: idea.votes.length,
    hasVoted: idea.votes.some((vote) => vote.userId === currentUserId),
    createdAt: idea.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Opsgenie
// ---------------------------------------------------------------------------

type AlertRow = Prisma.AlertGetPayload<{ include: { ackedBy: true } }>;
type ShiftRow = Prisma.OnCallShiftGetPayload<{ include: { user: true } }>;
type ScheduleRow = Prisma.OnCallScheduleGetPayload<{
  include: { shifts: { include: { user: true } } };
}>;

export function toAlert(alert: AlertRow): Alert {
  return {
    id: alert.id,
    workspaceId: alert.workspaceId,
    message: alert.message,
    priority: alert.priority,
    status: alert.status,
    source: alert.source,
    ackedBy: alert.ackedBy ? toUserRef(alert.ackedBy) : null,
    createdAt: alert.createdAt,
  };
}

export function toOnCallShift(shift: ShiftRow): OnCallShift {
  return {
    id: shift.id,
    scheduleId: shift.scheduleId,
    user: toUserRef(shift.user),
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
  };
}

export function toOnCallSchedule(schedule: ScheduleRow, now: Date = new Date()): OnCallSchedule {
  const shifts = [...schedule.shifts].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  const current = shifts.find((shift) => shift.startsAt <= now && shift.endsAt > now);
  return {
    id: schedule.id,
    workspaceId: schedule.workspaceId,
    name: schedule.name,
    shifts: shifts.map(toOnCallShift),
    currentOnCall: current ? toUserRef(current.user) : null,
  };
}

// ---------------------------------------------------------------------------
// Compass
// ---------------------------------------------------------------------------

type ComponentRow = Prisma.ComponentGetPayload<true>;

export function toComponent(component: ComponentRow): Component {
  return {
    id: component.id,
    workspaceId: component.workspaceId,
    name: component.name,
    type: component.type,
    description: component.description,
    ownerTeam: component.ownerTeam,
    tier: component.tier,
    healthScore: component.healthScore,
    createdAt: component.createdAt,
  };
}
