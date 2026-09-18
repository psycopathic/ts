// Auth endpoints, mounted at /api/auth.
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  loginUser,
  logoutHandler,
  refreshHandler,
  registerUser,
  twoFASetupHandler,
  twoFAVerifyHandler,
} from "./auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/2fa/setup", requireAuth, twoFASetupHandler);
router.post("/2fa/verify", requireAuth, twoFAVerifyHandler);

export default router;
