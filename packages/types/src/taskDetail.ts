import { z } from 'zod';
import { Activity } from './activity';
import { Comment } from './comment';
import { Task } from './task';

/** Full task detail shown in the task modal: the task plus comments + activity. */
export const TaskDetail = Task.extend({
  comments: z.array(Comment),
  activities: z.array(Activity),
});
export type TaskDetail = z.infer<typeof TaskDetail>;
