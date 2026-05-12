import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { StudentController } from "./student.controller";
import { StudentValidation } from "./student.validation";

const router = Router();

router.post(
  "/admit",
  auth("ADMIN"),
  validateRequest(StudentValidation.createStudent),
  StudentController.admitStudent,
);
router.get("/", auth("ADMIN", "TEACHER"), StudentController.getAllStudents);

router.get(
  "/parent/:parentId",
  auth("ADMIN", "PARENT"),
  StudentController.getStudentsByParent,
);

router.get(
  "/:id",
  auth("ADMIN", "TEACHER", "STUDENT", "PARENT"),
  StudentController.getStudentById,
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(StudentValidation.updateStudent),
  StudentController.updateStudent,
);
router.delete("/:id", auth("ADMIN"), StudentController.deleteStudent);

router.post(
  "/promote",
  auth("ADMIN"),
  validateRequest(StudentValidation.promoteStudents),
  StudentController.promoteStudents,
);
router.patch(
  "/transfer-section",
  auth("ADMIN"),
  validateRequest(StudentValidation.transferSection),
  StudentController.transferSection,
);

export const StudentRouter = router;
