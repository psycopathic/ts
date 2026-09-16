import { query } from "../../config/db";

export type Product = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProductInput = {
  title: string;
  description: string;
  imageUrl: string;
  userId: number;
};

export type UpdateProductInput = Pick<CreateProductInput, "title" | "description" | "imageUrl">;

const selectColumns = `
  id,
  title,
  description,
  image_url AS "imageUrl",
  user_id AS "userId",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function getAllProducts(): Promise<Product[]> {
  const result = await query<Product>(
    `SELECT ${selectColumns}
     FROM products
     ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function getProductsByUserId(userId: number): Promise<Product[]> {
  const result = await query<Product>(
    `SELECT ${selectColumns}
     FROM products
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function getProductById(productId: string): Promise<Product | null> {
  const result = await query<Product>(
    `SELECT ${selectColumns}
     FROM products
     WHERE id = $1`,
    [productId],
  );
  return result.rows[0] ?? null;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const result = await query<Product>(
    `INSERT INTO products (title, description, image_url, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${selectColumns}`,
    [input.title, input.description, input.imageUrl, input.userId],
  );

  const product = result.rows[0];
  if (!product) throw new Error("Failed to create product");
  return product;
}

export async function updateProduct(productId: string, input: UpdateProductInput): Promise<Product> {
  const result = await query<Product>(
    `UPDATE products
     SET title = $2,
         description = $3,
         image_url = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING ${selectColumns}`,
    [productId, input.title, input.description, input.imageUrl],
  );

  const product = result.rows[0];
  if (!product) throw new Error("Failed to update product");
  return product;
}

export async function deleteProduct(productId: string): Promise<void> {
  await query("DELETE FROM products WHERE id = $1", [productId]);
}
