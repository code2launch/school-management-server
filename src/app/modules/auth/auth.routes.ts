import { Router } from "express";
import { AuthController } from "./auth.controller";
import validateRequest from "../../middlewares/validateRequest";
import { AuthValidation } from "./auth.validation";
import auth from "../../middlewares/auth";

const router = Router();

router.post("/login", validateRequest(AuthValidation.login), AuthController.login);
router.post("/refresh-token", validateRequest(AuthValidation.refreshToken), AuthController.refreshToken);
router.get("/me", auth(), AuthController.getMe);
router.patch("/change-password", auth(), validateRequest(AuthValidation.changePassword), AuthController.changePassword);

export const AuthRouter = router;
