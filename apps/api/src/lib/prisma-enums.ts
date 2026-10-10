import prismaClient from "@prisma/client";
import type {
  GenerationStatus as GenerationStatusType,
  RecipeSource as RecipeSourceType,
  MessageRole as MessageRoleType,
  MessageResponseType as MessageResponseTypeType,
  ImageSource as ImageSourceType,
} from "@prisma/client";

// @prisma/client is CommonJS; named enum imports fail under native ESM.
export const GenerationStatus = prismaClient.GenerationStatus;
export type GenerationStatus = GenerationStatusType;

export const RecipeSource = prismaClient.RecipeSource;
export type RecipeSource = RecipeSourceType;

export const MessageRole = prismaClient.MessageRole;
export type MessageRole = MessageRoleType;

export const MessageResponseType = prismaClient.MessageResponseType;
export type MessageResponseType = MessageResponseTypeType;

export const ImageSource = prismaClient.ImageSource;
export type ImageSource = ImageSourceType;