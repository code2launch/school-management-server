import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AttendanceController } from "./attendance.controller";
import { AttendanceValidation } from "./attendance.validation";

const router = Router();

// Student attendance
router.post(
  "/students",
  auth("ADMIN", "TEACHER"),
  validateRequest(AttendanceValidation.markStudentAttendance),
  AttendanceController.markStudentAttendance
);
router.get("/students/by-date", auth("ADMIN", "TEACHER"), AttendanceController.getAttendanceByDate);
router.get("/students/monthly", auth("ADMIN", "TEACHER"), AttendanceController.getMonthlyAttendance);
router.get("/students/today-summary", auth("ADMIN", "TEACHER"), AttendanceController.getTodaySummary);
router.get(
  "/students/:studentId/summary",
  auth("ADMIN", "TEACHER", "STUDENT", "PARENT"),
  AttendanceController.getStudentAttendanceSummary
);

// Teacher attendance
router.post(
  "/teachers",
  auth("ADMIN"),
  validateRequest(AttendanceValidation.markTeacherAttendance),
  AttendanceController.markTeacherAttendance
);
router.get("/teachers/:teacherId/monthly", auth("ADMIN"), AttendanceController.getTeacherAttendanceByMonth);

export const AttendanceRouter = router;
