// Auth endpoints, mounted at /api/auth.
import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import {
  forgotPasswordHandler,
  googleAuthCallbackHandler,
  googleAuthStartHandler,
  loginUser,
  logoutHandler,
  refreshHandler,
  registerUser,
  resetPasswordHandler,
  twoFASetupHandler,
  twoFAVerifyHandler,
  verifyEmail,
} from "./auth.controllers";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshHandler);
router.get("/verify-email", verifyEmail);
router.post("/logout", logoutHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);
router.get("/google", googleAuthStartHandler);
router.get("/google/callback", googleAuthCallbackHandler);
router.post("/2fa/setup", requireAuth, twoFASetupHandler);
router.post("/2fa/verify", requireAuth, twoFAVerifyHandler);

export default router;
