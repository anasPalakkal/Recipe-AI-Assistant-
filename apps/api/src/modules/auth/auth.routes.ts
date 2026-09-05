import type { FastifyInstance } from "fastify";
import { signupSchema, loginSchema, googleSignInSchema } from "@recipeai/shared";
import * as authService from "./auth.service.js";
import { createSession, destroySession } from "../../plugins/session.plugin.js";
import { toPublicUser } from "../../lib/user.js";

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    "/signup",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = signupSchema.parse(request.body);
      const user = await authService.signup(body);
      await createSession(reply, user.id);
      return reply.status(201).send(toPublicUser(user));
    },
  );

  app.post(
    "/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const user = await authService.login(body);
      await createSession(reply, user.id);
      return reply.send(toPublicUser(user));
    },
  );

  app.post(
    "/google",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = googleSignInSchema.parse(request.body);
      const user = await authService.loginWithGoogle(body.idToken);
      await createSession(reply, user.id);
      return reply.send(toPublicUser(user));
    },
  );

  app.post("/logout", { preHandler: app.authenticate }, async (request, reply) => {
    await destroySession(request, reply);
    return reply.status(204).send();
  });

  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const user = await authService.getUserById(request.userId!);
    return reply.send(toPublicUser(user));
  });
}