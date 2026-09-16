// Product endpoints, mounted at /api/products.
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getMyProducts,
  getProductById,
  updateProduct,
} from "./product.controller";

const router = Router();

router.get("/", getAllProducts);
router.get("/my-products", requireAuth, getMyProducts);
router.get("/:id", getProductById);
router.post("/", requireAuth, createProduct);
router.put("/:id", requireAuth, updateProduct);
router.delete("/:id", requireAuth, deleteProduct);

export default router;
