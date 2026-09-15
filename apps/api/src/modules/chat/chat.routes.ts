import type { FastifyInstance } from "fastify";
import {
  sendMessageSchema,
  conversationIdParamSchema,
  messageIdParamSchema,
} from "@recipeai/shared";
import * as chatService from "./chat.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";
import { requireVerifiedEmail } from "../auth/require-verified-email.js";

// Chat messages are meaningfully more expensive than a single /recipes/generate
// call in practice (same underlying model call, plus growing history per
// message), so it gets its own limit rather than sharing recipes' bucket.
const CHAT_RATE_LIMIT = { max: 30, timeWindow: "1 hour", keyGenerator: sessionRateLimitKey };
const CONVERSATION_RATE_LIMIT = { max: 60, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };

export default async function chatRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/conversations",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CONVERSATION_RATE_LIMIT } },
    async (request, reply) => {
      const conversation = await chatService.createConversation(request.userId!);
      return reply.status(201).send(conversation);
    },
  );

  app.get(
    "/conversations",
    { config: { rateLimit: CONVERSATION_RATE_LIMIT } },
    async (request, reply) => {
      const conversations = await chatService.listConversations(request.userId!);
      return reply.send(conversations);
    },
  );

  app.get(
    "/conversations/:conversationId",
    { config: { rateLimit: CONVERSATION_RATE_LIMIT } },
    async (request, reply) => {
      const { conversationId } = conversationIdParamSchema.parse(request.params);
      const messages = await chatService.getConversationWithMessages(request.userId!, conversationId);
      return reply.send(messages);
    },
  );

  app.post(
    "/conversations/:conversationId/messages",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CHAT_RATE_LIMIT } },
    async (request, reply) => {
      const { conversationId } = conversationIdParamSchema.parse(request.params);
      const { prompt } = sendMessageSchema.parse(request.body);
      const result = await chatService.sendMessage(request.userId!, conversationId, prompt);
      return reply.status(201).send(result);
    },
  );

  app.post(
    "/conversations/:conversationId/messages/:messageId/regenerate",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CHAT_RATE_LIMIT } },
    async (request, reply) => {
      const { conversationId, messageId } = messageIdParamSchema.parse(request.params);
      const message = await chatService.regenerateMessage(request.userId!, conversationId, messageId);
      return reply.send(message);
    },
  );

  app.post(
    "/conversations/:conversationId/messages/:messageId/save",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CONVERSATION_RATE_LIMIT } },
    async (request, reply) => {
      const { conversationId, messageId } = messageIdParamSchema.parse(request.params);
      const recipe = await chatService.saveMessageAsRecipe(request.userId!, conversationId, messageId);
      return reply.status(201).send(recipe);
    },
  );
}