import { Router } from "express";
import auth from "../../middlewares/auth";
import { ReportController } from "./report.controller";

const router = Router();

router.get("/attendance", auth("ADMIN", "TEACHER"), ReportController.getAttendanceReport);
router.get("/fees", auth("ADMIN"), ReportController.getFeeCollectionReport);
router.get("/students", auth("ADMIN", "TEACHER"), ReportController.getStudentListByClass);
router.get("/results/:examId", auth("ADMIN", "TEACHER"), ReportController.getResultSheetReport);

export const ReportRouter = router;
