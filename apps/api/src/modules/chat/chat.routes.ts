import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
    sendMessageSchema,
    conversationIdParamSchema,
    messageIdParamSchema,
    updateConversationSchema,
} from "@recipeai/shared";
import * as chatService from "./chat.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";
import { BadRequestError } from "../../lib/errors.js";

const CHAT_RATE_LIMIT = { max: 30, timeWindow: "1 hour", keyGenerator: sessionRateLimitKey };
const CONVERSATION_RATE_LIMIT = { max: 60, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };

const imageMessageQuerySchema = z.object({
    question: z.string().trim().min(1).max(300).optional(),
});

// Image-attached messages are multipart/form-data, text-only messages are
// JSON. Both the first-message and follow-up routes share this handling.
async function dispatchMessage(request: FastifyRequest, conversationId: string | null) {
    if (request.isMultipart()) {
        const file = await request.file();
        if (!file) {
            throw new BadRequestError("No image file provided", "IMAGE_REQUIRED");
        }
        const buffer = await file.toBuffer();
        if (file.file.truncated) {
            throw new BadRequestError("Image exceeds the upload limit", "IMAGE_TOO_LARGE");
        }

        const questionField = file.fields.question;
        const question =
            questionField && "value" in questionField ? String(questionField.value) : undefined;
        const { question: validatedQuestion } = imageMessageQuerySchema.parse({ question });

        return chatService.sendImageMessage(
            request.userId!,
            conversationId,
            buffer,
            validatedQuestion,
            request.log,
        );
    }

    const { prompt } = sendMessageSchema.parse(request.body);
    return chatService.sendMessage(request.userId!, conversationId, prompt, request.log);
}

export default async function chatRoutes(app: FastifyInstance) {
    app.post(
        "/conversations",
        { config: { rateLimit: CONVERSATION_RATE_LIMIT } },
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
        "/messages",
        { config: { rateLimit: CHAT_RATE_LIMIT } },
        async (request, reply) => {
            const result = await dispatchMessage(request, null);
            return reply.status(201).send(result);
        },
    );

    app.post(
        "/conversations/:conversationId/messages",
        { config: { rateLimit: CHAT_RATE_LIMIT } },
        async (request, reply) => {
            const { conversationId } = conversationIdParamSchema.parse(request.params);
            const result = await dispatchMessage(request, conversationId);
            return reply.status(201).send(result);
        },
    );

    app.post(
        "/conversations/:conversationId/messages/:messageId/regenerate",
        { config: { rateLimit: CHAT_RATE_LIMIT } },
        async (request, reply) => {
            const { conversationId, messageId } = messageIdParamSchema.parse(request.params);
            const message = await chatService.regenerateMessage(request.userId!, conversationId, messageId, request.log);
            return reply.send(message);
        },
    );

    app.post(
        "/conversations/:conversationId/messages/:messageId/save",
        { config: { rateLimit: CONVERSATION_RATE_LIMIT } },
        async (request, reply) => {
            const { conversationId, messageId } = messageIdParamSchema.parse(request.params);
            const recipe = await chatService.saveMessageAsRecipe(request.userId!, conversationId, messageId);
            return reply.status(201).send(recipe);
        },
    );

    app.patch(
        "/conversations/:conversationId",
        { config: { rateLimit: CONVERSATION_RATE_LIMIT } },
        async (request, reply) => {
            const { conversationId } = conversationIdParamSchema.parse(request.params);
            const body = updateConversationSchema.parse(request.body);
            const conversation = await chatService.updateConversation(request.userId!, conversationId, body);
            return reply.send(conversation);
        },
    );

    app.delete(
        "/conversations/:conversationId",
        { config: { rateLimit: CONVERSATION_RATE_LIMIT } },
        async (request, reply) => {
            const { conversationId } = conversationIdParamSchema.parse(request.params);
            await chatService.deleteConversation(request.userId!, conversationId, request.log);
            return reply.status(204).send();
        },
    );
}