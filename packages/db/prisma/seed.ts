import { hash } from '@node-rs/argon2';
import { PrismaClient, type Priority, type TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Argon2 parameters shared with the API (see apps/api/src/auth/password.ts).
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

const DEMO_PASSWORD = 'password123';

async function main(): Promise<void> {
  console.log('🌱 Seeding TaskFlow database...');

  // Clean slate (order respects foreign keys; most are ON DELETE CASCADE).
  // Suite products first (they reference users/workspaces).
  await prisma.onCallShift.deleteMany();
  await prisma.onCallSchedule.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.ideaVote.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.ideaBoard.deleteMany();
  await prisma.requestComment.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.requestType.deleteMany();
  await prisma.serviceDesk.deleteMany();
  await prisma.incidentUpdate.deleteMany();
  await prisma.statusIncident.deleteMany();
  await prisma.statusComponent.deleteMany();
  await prisma.statusPage.deleteMany();
  await prisma.trelloCard.deleteMany();
  await prisma.trelloList.deleteMany();
  await prisma.trelloBoard.deleteMany();
  await prisma.page.deleteMany();
  await prisma.space.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.project.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash(DEMO_PASSWORD, ARGON2_OPTIONS);

  const ada = await prisma.user.create({
    data: { email: 'ada@taskflow.dev', name: 'Ada Lovelace', passwordHash },
  });
  const grace = await prisma.user.create({
    data: { email: 'grace@taskflow.dev', name: 'Grace Hopper', passwordHash },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Engineering',
      slug: 'acme-engineering',
      memberships: {
        create: [
          { userId: ada.id, role: 'OWNER' },
          { userId: grace.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const labels = await Promise.all(
    [
      { name: 'bug', color: '#ef4444' },
      { name: 'feature', color: '#6366f1' },
      { name: 'chore', color: '#f59e0b' },
      { name: 'design', color: '#22c55e' },
    ].map((label) => prisma.label.create({ data: { ...label, workspaceId: workspace.id } })),
  );
  const labelByName = new Map(labels.map((label) => [label.name, label]));

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Web App',
      key: 'WEB',
      description: 'The customer-facing web application.',
    },
  });

  type SeedTask = {
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    assigneeId: string | null;
    labels: string[];
    dueInDays?: number;
  };

  const seedTasks: SeedTask[] = [
    {
      title: 'Set up CI pipeline',
      description: '## Goal\nAutomated lint, typecheck and tests on every PR.',
      status: 'DONE',
      priority: 'HIGH',
      assigneeId: ada.id,
      labels: ['chore'],
    },
    {
      title: 'Design kanban board layout',
      description: 'Wireframes for the **board** view with draggable columns.',
      status: 'DONE',
      priority: 'MEDIUM',
      assigneeId: grace.id,
      labels: ['design'],
    },
    {
      title: 'Implement drag-and-drop',
      description: 'Use dnd-kit. Persist `position` on drop with optimistic UI.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: ada.id,
      labels: ['feature'],
      dueInDays: 3,
    },
    {
      title: 'Realtime board updates',
      description: 'Broadcast task events over WebSocket to connected clients.',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      assigneeId: grace.id,
      labels: ['feature'],
      dueInDays: 5,
    },
    {
      title: 'Task detail modal',
      description: 'Markdown description, comments and an activity feed.',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: ada.id,
      labels: ['feature'],
    },
    {
      title: 'Filtering & search',
      description: 'Filter by assignee, label, priority and free text.',
      status: 'TODO',
      priority: 'LOW',
      assigneeId: null,
      labels: ['feature'],
    },
    {
      title: 'Fix flaky session refresh',
      description: 'Sessions occasionally expire early; investigate sliding expiry.',
      status: 'BACKLOG',
      priority: 'MEDIUM',
      assigneeId: null,
      labels: ['bug'],
    },
    {
      title: 'Dark mode',
      description: 'Add a dark theme using the design tokens.',
      status: 'BACKLOG',
      priority: 'LOW',
      assigneeId: grace.id,
      labels: ['design', 'feature'],
    },
  ];

  // Assign incremental positions per status column.
  const positionByStatus = new Map<TaskStatus, number>();

  for (const seed of seedTasks) {
    const position = (positionByStatus.get(seed.status) ?? 0) + 1000;
    positionByStatus.set(seed.status, position);

    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        title: seed.title,
        description: seed.description,
        status: seed.status,
        priority: seed.priority,
        position,
        assigneeId: seed.assigneeId,
        creatorId: ada.id,
        dueDate:
          seed.dueInDays === undefined
            ? null
            : new Date(Date.now() + seed.dueInDays * 24 * 60 * 60 * 1000),
        labels: {
          create: seed.labels
            .map((name) => labelByName.get(name))
            .filter((label): label is NonNullable<typeof label> => Boolean(label))
            .map((label) => ({ labelId: label.id })),
        },
        activities: {
          create: { actorId: ada.id, type: 'TASK_CREATED', data: {} },
        },
      },
    });

    if (seed.status === 'IN_PROGRESS') {
      await prisma.comment.create({
        data: {
          taskId: task.id,
          authorId: grace.id,
          body: 'Started on this — will push a draft PR shortly.',
        },
      });
      await prisma.activity.create({
        data: { taskId: task.id, actorId: grace.id, type: 'COMMENT_ADDED', data: {} },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Confluence — a space with a small page tree
  // -------------------------------------------------------------------------
  const engSpace = await prisma.space.create({
    data: {
      workspaceId: workspace.id,
      key: 'ENG',
      name: 'Engineering',
      description: 'Team docs, runbooks and onboarding.',
    },
  });

  const homePage = await prisma.page.create({
    data: {
      spaceId: engSpace.id,
      title: 'Engineering Home',
      authorId: ada.id,
      position: 1000,
      body: [
        '# Engineering Home',
        '',
        'Welcome to the **Engineering** space. This is where we keep our team',
        'knowledge, runbooks and onboarding material.',
        '',
        '## Quick links',
        '',
        '- [Onboarding](#) — get set up on your first day',
        '- [On-call runbook](#) — how we handle incidents',
        '- [Coding standards](#) — how we write and review code',
        '',
        '> Keep pages short and link generously.',
      ].join('\n'),
    },
  });

  await prisma.page.create({
    data: {
      spaceId: engSpace.id,
      parentId: homePage.id,
      title: 'Onboarding',
      authorId: grace.id,
      position: 1000,
      body: [
        '# Onboarding',
        '',
        'A checklist for your first week:',
        '',
        '1. Get access to the repo and CI',
        '2. Set up your local environment',
        '3. Ship a small change end-to-end',
        '4. Pair with a teammate on a review',
      ].join('\n'),
    },
  });

  await prisma.page.create({
    data: {
      spaceId: engSpace.id,
      parentId: homePage.id,
      title: 'Coding Standards',
      authorId: ada.id,
      position: 2000,
      body: [
        '# Coding Standards',
        '',
        '- Prefer clarity over cleverness',
        '- Types are the single source of truth',
        '- Every mutation is validated and authorized',
        '- Never commit a red build',
      ].join('\n'),
    },
  });

  // -------------------------------------------------------------------------
  // Trello — a roadmap board with lists & cards
  // -------------------------------------------------------------------------
  const trelloBoard = await prisma.trelloBoard.create({
    data: { workspaceId: workspace.id, name: 'Product Roadmap' },
  });

  const trelloListSeed: { name: string; cards: string[] }[] = [
    { name: 'Backlog', cards: ['Mobile app', 'SSO login', 'Dark mode'] },
    { name: 'This week', cards: ['Onboarding revamp', 'Billing page'] },
    { name: 'In progress', cards: ['Realtime sync'] },
    { name: 'Done', cards: ['Landing page', 'Pricing experiment'] },
  ];

  for (const [listIndex, seedList] of trelloListSeed.entries()) {
    const list = await prisma.trelloList.create({
      data: {
        boardId: trelloBoard.id,
        name: seedList.name,
        position: (listIndex + 1) * 1000,
      },
    });
    for (const [cardIndex, title] of seedList.cards.entries()) {
      await prisma.trelloCard.create({
        data: { listId: list.id, title, position: (cardIndex + 1) * 1000 },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Statuspage — components + a resolved incident
  // -------------------------------------------------------------------------
  const statusPage = await prisma.statusPage.create({
    data: { workspaceId: workspace.id, name: 'Acme Status' },
  });
  const componentSeed: { name: string; status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' }[] = [
    { name: 'Web App', status: 'OPERATIONAL' },
    { name: 'API', status: 'DEGRADED' },
    { name: 'Realtime (WebSocket)', status: 'OPERATIONAL' },
    { name: 'Database', status: 'OPERATIONAL' },
  ];
  for (const [i, c] of componentSeed.entries()) {
    await prisma.statusComponent.create({
      data: { pageId: statusPage.id, name: c.name, status: c.status, position: (i + 1) * 1000 },
    });
  }
  const incident = await prisma.statusIncident.create({
    data: {
      pageId: statusPage.id,
      title: 'Elevated API latency',
      impact: 'MAJOR',
      status: 'MONITORING',
    },
  });
  await prisma.incidentUpdate.create({
    data: {
      incidentId: incident.id,
      status: 'INVESTIGATING',
      authorId: ada.id,
      body: 'We are investigating reports of slow API responses.',
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  });
  await prisma.incidentUpdate.create({
    data: {
      incidentId: incident.id,
      status: 'MONITORING',
      authorId: grace.id,
      body: 'A fix has been deployed and we are monitoring recovery.',
    },
  });

  // -------------------------------------------------------------------------
  // Jira Service Management — a desk with request types & requests
  // -------------------------------------------------------------------------
  const desk = await prisma.serviceDesk.create({
    data: { workspaceId: workspace.id, name: 'IT Support' },
  });
  const itHelp = await prisma.requestType.create({
    data: { serviceDeskId: desk.id, name: 'Get IT help', description: 'Report a problem or ask a question.' },
  });
  const accessType = await prisma.requestType.create({
    data: { serviceDeskId: desk.id, name: 'Request access', description: 'Request access to a system or tool.' },
  });
  const req1 = await prisma.serviceRequest.create({
    data: {
      serviceDeskId: desk.id,
      requestTypeId: itHelp.id,
      summary: 'Laptop will not boot',
      description: 'Black screen on startup after the latest update.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      reporterId: grace.id,
      assigneeId: ada.id,
    },
  });
  await prisma.requestComment.create({
    data: { requestId: req1.id, authorId: ada.id, body: 'Thanks — can you try holding the power button for 10s?' },
  });
  await prisma.serviceRequest.create({
    data: {
      serviceDeskId: desk.id,
      requestTypeId: accessType.id,
      summary: 'Access to the analytics dashboard',
      status: 'OPEN',
      priority: 'MEDIUM',
      reporterId: grace.id,
    },
  });
  await prisma.serviceRequest.create({
    data: {
      serviceDeskId: desk.id,
      requestTypeId: itHelp.id,
      summary: 'VPN keeps disconnecting',
      status: 'WAITING',
      priority: 'LOW',
      reporterId: ada.id,
    },
  });

  // -------------------------------------------------------------------------
  // Jira Product Discovery — an idea board with votes
  // -------------------------------------------------------------------------
  const ideaBoard = await prisma.ideaBoard.create({
    data: { workspaceId: workspace.id, name: 'Roadmap ideas' },
  });
  const ideaSeed: {
    title: string;
    description: string;
    impact: number;
    effort: number;
    status: 'NEW' | 'UNDER_REVIEW' | 'PLANNED' | 'SHIPPED';
    voters: string[];
  }[] = [
    { title: 'Dark mode', description: 'A dark theme across all products.', impact: 4, effort: 2, status: 'PLANNED', voters: [ada.id, grace.id] },
    { title: 'Mobile app', description: 'Native iOS + Android apps.', impact: 5, effort: 5, status: 'UNDER_REVIEW', voters: [grace.id] },
    { title: 'Slack integration', description: 'Notify channels on key events.', impact: 3, effort: 2, status: 'NEW', voters: [ada.id] },
    { title: 'CSV export', description: 'Export any list to CSV.', impact: 2, effort: 1, status: 'SHIPPED', voters: [] },
    { title: 'AI summaries', description: 'Summarize long threads and pages.', impact: 5, effort: 4, status: 'NEW', voters: [ada.id, grace.id] },
  ];
  for (const seed of ideaSeed) {
    const idea = await prisma.idea.create({
      data: {
        boardId: ideaBoard.id,
        title: seed.title,
        description: seed.description,
        impact: seed.impact,
        effort: seed.effort,
        status: seed.status,
        creatorId: ada.id,
      },
    });
    for (const userId of seed.voters) {
      await prisma.ideaVote.create({ data: { ideaId: idea.id, userId } });
    }
  }

  // -------------------------------------------------------------------------
  // Opsgenie — alerts + an on-call schedule (Ada on call now)
  // -------------------------------------------------------------------------
  await prisma.alert.create({
    data: {
      workspaceId: workspace.id,
      message: 'High error rate on checkout service',
      priority: 'P1',
      status: 'OPEN',
      source: 'Datadog',
    },
  });
  await prisma.alert.create({
    data: {
      workspaceId: workspace.id,
      message: 'Disk usage above 85% on db-primary',
      priority: 'P3',
      status: 'ACKED',
      source: 'Prometheus',
      ackedById: grace.id,
    },
  });
  await prisma.alert.create({
    data: {
      workspaceId: workspace.id,
      message: 'Nightly backup completed with warnings',
      priority: 'P5',
      status: 'CLOSED',
      source: 'cron',
    },
  });
  const schedule = await prisma.onCallSchedule.create({
    data: { workspaceId: workspace.id, name: 'Primary' },
  });
  const now = Date.now();
  await prisma.onCallShift.create({
    data: {
      scheduleId: schedule.id,
      userId: ada.id,
      startsAt: new Date(now - 2 * 60 * 60 * 1000),
      endsAt: new Date(now + 6 * 60 * 60 * 1000),
    },
  });
  await prisma.onCallShift.create({
    data: {
      scheduleId: schedule.id,
      userId: grace.id,
      startsAt: new Date(now + 6 * 60 * 60 * 1000),
      endsAt: new Date(now + 14 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Seeded ${seedTasks.length} tasks across 4 columns.`);
  console.log('✅ Seeded Confluence space "Engineering" with a page tree.');
  console.log('✅ Seeded Trello board "Product Roadmap" with 4 lists.');
  console.log('✅ Seeded Statuspage "Acme Status" with components + an incident.');
  console.log('✅ Seeded Service desk "IT Support" with request types + requests.');
  console.log('✅ Seeded Product Discovery board "Roadmap ideas" with 5 ideas.');
  console.log('✅ Seeded Opsgenie alerts + on-call schedule "Primary".');
  console.log(`   Demo login: ada@taskflow.dev / ${DEMO_PASSWORD}`);
  console.log(`   Demo login: grace@taskflow.dev / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
