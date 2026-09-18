import api, { setAccessToken } from "./axios";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: "user" | "admin";
  twoFactorEnabled: boolean;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
};

type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

// Auth API
export const registerUser = async (userData: RegisterInput) => {
  const { data } = await api.post<ApiResponse<{ user: AuthUser }>>("/auth/register", userData);
  return data;
};

export const loginUser = async (credentials: LoginInput) => {
  const { data } = await api.post<ApiResponse<AuthSession>>("/auth/login", credentials);
  setAccessToken(data.data.accessToken);
  return data;
};

export const refreshSession = async () => {
  const { data } = await api.post<ApiResponse<AuthSession>>("/auth/refresh");
  setAccessToken(data.data.accessToken);
  return data;
};

export const logoutUser = async () => {
  const { data } = await api.post<ApiResponse<null>>("/auth/logout");
  setAccessToken(null);
  return data;
};

export const setupTwoFactor = async () => {
  const { data } = await api.post<ApiResponse<{ otpAuthUrl: string; secret: string }>>(
    "/auth/2fa/setup",
  );
  return data;
};

export const verifyTwoFactor = async (code: string) => {
  const { data } = await api.post<ApiResponse<{ twoFactorEnabled: true }>>(
    "/auth/2fa/verify",
    { code },
  );
  return data;
};

export type ProductInput = {
  title: string;
  description: string;
  imageUrl: string;
};

export type Product = ProductInput & {
  id: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductComment = {
  id: string;
  content: string;
  userId: number;
  productId: string;
  createdAt: string;
};

// Products API
export const getAllProducts = async () => {
  const { data } = await api.get("/products");
  return data;
};

export const getProductById = async (id: string) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

export const getMyProducts = async () => {
  const { data } = await api.get("/products/my");
  return data;
};

export const createProduct = async (productData: ProductInput) => {
  const { data } = await api.post("/products", productData);
  return data;
};

export const updateProduct = async ({
  id,
  ...productData
}: ProductInput & { id: string }) => {
  const { data } = await api.put(`/products/${id}`, productData);
  return data;
};

export const deleteProduct = async (id: string) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

// Comments API
export const createComment = async ({
  productId,
  content,
}: {
  productId: string;
  content: string;
}) => {
  const { data } = await api.post<ApiResponse<ProductComment>>(`/comments/${productId}`, { content });
  return data;
};

export const deleteComment = async ({ commentId }: { commentId: string }) => {
  const { data } = await api.delete<ApiResponse<null>>(`/comments/${commentId}`);
  return data;
};
