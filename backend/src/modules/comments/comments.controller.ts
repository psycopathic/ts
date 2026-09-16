// HTTP handlers for creating and deleting comments.
import type { Request } from "express";
import { z } from "zod";
import type { AuthUser } from "../auth/auth.services";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import * as commentsService from "./comments.service";

const createCommentParamsSchema = z.object({ productId: z.uuid() });
const deleteCommentParamsSchema = z.object({ commentId: z.uuid() });
const createCommentBodySchema = z.object({ content: z.string().trim().min(1) });

const parse = <T extends z.ZodType>(schema: T, data: unknown): z.output<T> => {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(400, "Invalid data!", result.error.issues);
  return result.data;
};

const getAuthUser = (req: Request): AuthUser => {
  const user = (req as Request & { user?: AuthUser }).user;
  if (!user) throw new ApiError(401, "Not authenticated");
  return user;
};

export const createComment = asyncHandler(async (req, res) => {
  const { id: userId } = getAuthUser(req);
  const { productId } = parse(createCommentParamsSchema, req.params);
  const { content } = parse(createCommentBodySchema, req.body);
  const comment = await commentsService.createComment({ content, userId, productId });

  res.status(201).json(new ApiResponse(201, comment, "Comment created successfully"));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { id: userId } = getAuthUser(req);
  const { commentId } = parse(deleteCommentParamsSchema, req.params);
  await commentsService.deleteComment(commentId, userId);

  res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));
});
