import type { Request } from "express";
import { z } from "zod";
import type { AuthUser } from "../auth/auth.services";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import * as productService from "./product.service";

const productParamsSchema = z.object({ id: z.uuid() });

const productBodySchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageUrl: z.url(),
});

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

export const getAllProducts = asyncHandler(async (_req, res) => {
  const products = await productService.getAllProducts();
  res.status(200).json(new ApiResponse(200, products, "Products retrieved successfully"));
});

export const getMyProducts = asyncHandler(async (req, res) => {
  const { id: userId } = getAuthUser(req);
  const products = await productService.getProductsByUserId(userId);
  res.status(200).json(new ApiResponse(200, products, "Products retrieved successfully"));
});

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = parse(productParamsSchema, req.params);
  const product = await productService.getProductById(id);
  res.status(200).json(new ApiResponse(200, product, "Product retrieved successfully"));
});

export const createProduct = asyncHandler(async (req, res) => {
  const { id: userId } = getAuthUser(req);
  const input = parse(productBodySchema, req.body);
  const product = await productService.createProduct({ ...input, userId });
  res.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id: userId } = getAuthUser(req);
  const { id } = parse(productParamsSchema, req.params);
  const input = parse(productBodySchema, req.body);
  const product = await productService.updateProduct(id, userId, input);
  res.status(200).json(new ApiResponse(200, product, "Product updated successfully"));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id: userId } = getAuthUser(req);
  const { id } = parse(productParamsSchema, req.params);
  await productService.deleteProduct(id, userId);
  res.status(200).json(new ApiResponse(200, null, "Product deleted successfully"));
});
