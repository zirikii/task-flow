import { TRPCError } from '@trpc/server';
import { LoginInput, SessionUser, SignupInput } from '@taskflow/types';
import { hashPassword, verifyPassword } from '../auth/password';
import { createSession } from '../auth/session';
import { protectedProcedure, publicProcedure, router } from '../trpc';

export const authRouter = router({
  signup: publicProcedure.input(SignupInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'An account with that email already exists.' });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await ctx.db.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });

    const { token, session } = await createSession(user.id);
    ctx.setSessionCookie(token, session.expiresAt);

    return SessionUser.parse(user);
  }),

  login: publicProcedure.input(LoginInput).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({ where: { email: input.email } });
    const valid = user ? await verifyPassword(user.passwordHash, input.password) : false;
    if (!user || !valid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    }

    const { token, session } = await createSession(user.id);
    ctx.setSessionCookie(token, session.expiresAt);

    return SessionUser.parse(user);
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.session.delete({ where: { id: ctx.session.id } }).catch(() => undefined);
    ctx.clearSessionCookie();
    return { success: true };
  }),

  me: publicProcedure.query(({ ctx }) => {
    return ctx.user ? SessionUser.parse(ctx.user) : null;
  }),
});
