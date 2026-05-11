import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ExamController } from "./exam.controller";
import { ExamValidation } from "./exam.validation";

const router = Router();

router.post("/", auth("ADMIN"), validateRequest(ExamValidation.createExam), ExamController.createExam);
router.get("/", auth("ADMIN", "TEACHER", "STUDENT", "PARENT"), ExamController.getAllExams);
router.get("/:id", auth("ADMIN", "TEACHER", "STUDENT", "PARENT"), ExamController.getExamById);
router.patch("/:id/publish", auth("ADMIN"), ExamController.publishExam);

router.post("/subjects", auth("ADMIN"), validateRequest(ExamValidation.addExamSubject), ExamController.addExamSubject);
router.post("/marks", auth("ADMIN", "TEACHER"), validateRequest(ExamValidation.enterMarks), ExamController.enterMarks);

router.get("/:examId/result-sheet", auth("ADMIN", "TEACHER"), ExamController.getResultSheet);
router.get("/:examId/report-card/:studentId", auth("ADMIN", "TEACHER", "STUDENT", "PARENT"), ExamController.getStudentReportCard);

export const ExamRouter = router;
