import { Router } from "express";
import { TeacherController } from "./teacher.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { TeacherValidation } from "./teacher.validation";

const router = Router();

router.post("/", auth("ADMIN"), validateRequest(TeacherValidation.createTeacher), TeacherController.createTeacher);
router.get("/", auth("ADMIN"), TeacherController.getAllTeachers);
router.get("/:id", auth("ADMIN", "TEACHER"), TeacherController.getTeacherById);
router.patch("/:id", auth("ADMIN"), validateRequest(TeacherValidation.updateTeacher), TeacherController.updateTeacher);
router.delete("/:id", auth("ADMIN"), TeacherController.deleteTeacher);
router.post("/:id/assign-subjects", auth("ADMIN"), TeacherController.assignSubjects);
router.get("/:id/subjects", auth("ADMIN", "TEACHER"), TeacherController.getTeacherSubjects);

export const TeacherRouter = router;
