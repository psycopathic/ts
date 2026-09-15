// Business logic for creating comments and enforcing comment ownership.
import { ApiError } from "../../utils/ApiError";
import {
  createComment as insertComment,
  deleteComment as removeComment,
  findCommentById,
  productExists,
  type Comment,
  type CreateCommentInput,
} from "./comments.repository";

export const createComment = async (input: CreateCommentInput): Promise<Comment> => {
  if (!(await productExists(input.productId))) {
    throw new ApiError(404, "Product not found");
  }

  return insertComment(input);
};

export const deleteComment = async (commentId: string, userId: number): Promise<void> => {
  const comment = await findCommentById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");
  if (comment.userId !== userId) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await removeComment(commentId);
};
