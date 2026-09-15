import { query } from "../../config/db";

export type Comment = {
  id: string;
  content: string;
  userId: number;
  productId: string;
  createdAt: Date;
};

export type CreateCommentInput = {
  content: string;
  userId: number;
  productId: string;
};

const selectColumns = `
  id,
  content,
  user_id AS "userId",
  product_id AS "productId",
  created_at AS "createdAt"
`;

export async function productExists(productId: string): Promise<boolean> {
  const result = await query("SELECT 1 FROM products WHERE id = $1 LIMIT 1", [productId]);
  return result.rows.length > 0;
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const result = await query<Comment>(
    `INSERT INTO comments (content, user_id, product_id)
     VALUES ($1, $2, $3)
     RETURNING ${selectColumns}`,
    [input.content, input.userId, input.productId],
  );

  const comment = result.rows[0];
  if (!comment) throw new Error("Failed to create comment");
  return comment;
}

export async function findCommentById(commentId: string): Promise<Comment | null> {
  const result = await query<Comment>(
    `SELECT ${selectColumns}
     FROM comments
     WHERE id = $1`,
    [commentId],
  );
  return result.rows[0] ?? null;
}

export async function deleteComment(commentId: string): Promise<void> {
  await query("DELETE FROM comments WHERE id = $1", [commentId]);
}
