import { z } from 'zod';
import { idSchema } from './common';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const SignupInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: emailSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof SignupInput>;

export const LoginInput = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** The authenticated user as returned by `auth.me` / `auth.login` / `auth.signup`. */
export const SessionUser = z.object({
  id: idSchema,
  email: z.string(),
  name: z.string(),
});
export type SessionUser = z.infer<typeof SessionUser>;
