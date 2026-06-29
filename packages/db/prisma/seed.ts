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

  console.log(`✅ Seeded ${seedTasks.length} tasks across 4 columns.`);
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
