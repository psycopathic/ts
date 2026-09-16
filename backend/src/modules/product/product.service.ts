import { ApiError } from "../../utils/ApiError";
import * as productRepository from "./product.repository";
import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "./product.repository";

export const getAllProducts = (): Promise<Product[]> => productRepository.getAllProducts();

export const getProductsByUserId = (userId: number): Promise<Product[]> => (
  productRepository.getProductsByUserId(userId)
);

export async function getProductById(productId: string): Promise<Product> {
  const product = await productRepository.getProductById(productId);
  if (!product) throw new ApiError(404, "Product not found");
  return product;
}

export const createProduct = (input: CreateProductInput): Promise<Product> => (
  productRepository.createProduct(input)
);

export async function updateProduct(
  productId: string,
  userId: number,
  input: UpdateProductInput,
): Promise<Product> {
  const product = await getProductById(productId);
  if (product.userId !== userId) {
    throw new ApiError(403, "You can only update your own products");
  }

  return productRepository.updateProduct(productId, input);
}

export async function deleteProduct(productId: string, userId: number): Promise<void> {
  const product = await getProductById(productId);
  if (product.userId !== userId) {
    throw new ApiError(403, "You can only delete your own products");
  }

  await productRepository.deleteProduct(productId);
}
