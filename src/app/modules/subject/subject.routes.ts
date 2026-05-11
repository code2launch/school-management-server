import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { SubjectController } from "./subject.controller";
import { SubjectValidation } from "./subject.validation";

const router = Router();

router.post("/", auth("ADMIN"), validateRequest(SubjectValidation.createSubject), SubjectController.createSubject);
router.get("/by-class/:classId", auth("ADMIN", "TEACHER"), SubjectController.getSubjectsByClass);
router.patch("/:id", auth("ADMIN"), SubjectController.updateSubject);
router.delete("/:id", auth("ADMIN"), SubjectController.deleteSubject);

// Teacher assignments
router.post("/assign-teacher", auth("ADMIN"), validateRequest(SubjectValidation.assignTeacher), SubjectController.assignTeacher);
router.delete("/assignments/:id", auth("ADMIN"), SubjectController.removeTeacherAssignment);

// Routine
router.post("/routine", auth("ADMIN"), validateRequest(SubjectValidation.createRoutineSlot), SubjectController.createRoutineSlot);
router.get("/routine/section/:sectionId", auth("ADMIN", "TEACHER", "STUDENT", "PARENT"), SubjectController.getRoutineBySection);
router.delete("/routine/:id", auth("ADMIN"), SubjectController.deleteRoutineSlot);

export const SubjectRouter = router;
