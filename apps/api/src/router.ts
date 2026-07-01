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
import { opsgenieRouter } from './routers/opsgenie';
import { compassRouter } from './routers/compass';
import { bitbucketRouter } from './routers/bitbucket';
import { atlasRouter } from './routers/atlas';

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
  opsgenie: opsgenieRouter,
  compass: compassRouter,
  bitbucket: bitbucketRouter,
  atlas: atlasRouter,
});

export type AppRouter = typeof appRouter;
