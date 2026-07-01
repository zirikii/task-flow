import { router } from './trpc';
import { authRouter } from './routers/auth';
import { workspaceRouter } from './routers/workspace';
import { projectRouter } from './routers/project';
import { taskRouter } from './routers/task';
import { labelRouter } from './routers/label';
import { commentRouter } from './routers/comment';
import { confluenceRouter } from './routers/confluence';
import { trelloRouter } from './routers/trello';
import { statuspageRouter } from './routers/statuspage';
import { servicedeskRouter } from './routers/servicedesk';
import { discoveryRouter } from './routers/discovery';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
  label: labelRouter,
  comment: commentRouter,
  confluence: confluenceRouter,
  trello: trelloRouter,
  statuspage: statuspageRouter,
  servicedesk: servicedeskRouter,
  discovery: discoveryRouter,
});

export type AppRouter = typeof appRouter;
