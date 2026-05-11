import { Router } from "express";
import auth from "../../middlewares/auth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

// Auto-detects role and returns appropriate dashboard
router.get("/", auth(), DashboardController.getDashboard);

// Explicit admin views
router.get("/admin", auth("ADMIN"), DashboardController.getAdminDashboard);
router.get("/teacher/:teacherId", auth("ADMIN", "TEACHER"), DashboardController.getTeacherDashboard);
router.get("/student/:studentId", auth("ADMIN", "TEACHER", "STUDENT", "PARENT"), DashboardController.getStudentDashboard);

export const DashboardRouter = router;
