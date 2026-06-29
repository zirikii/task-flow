import { router } from './trpc';
import { authRouter } from './routers/auth';
import { workspaceRouter } from './routers/workspace';
import { projectRouter } from './routers/project';
import { taskRouter } from './routers/task';
import { labelRouter } from './routers/label';
import { commentRouter } from './routers/comment';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  task: taskRouter,
  label: labelRouter,
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;
