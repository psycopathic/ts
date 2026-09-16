// Comment endpoints, mounted at /api/comments.
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { createComment, deleteComment } from "./comments.controller";

const router = Router();

router.post("/:productId", requireAuth, createComment);
router.delete("/:commentId", requireAuth, deleteComment);

export default router;
