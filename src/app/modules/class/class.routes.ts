import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ClassController } from "./class.controller";
import { ClassValidation } from "./class.validation";

const router = Router();

router.get("/", ClassController.getAllClasses);
router.post("/", auth("ADMIN"), validateRequest(ClassValidation.createClass), ClassController.createClass);
router.get("/:id", ClassController.getClassById);
router.patch("/:id", auth("ADMIN"), ClassController.updateClass);
router.delete("/:id", auth("ADMIN"), ClassController.deleteClass);

// Sections
router.get("/:classId/sections", ClassController.getSectionsByClass);
router.post("/sections", auth("ADMIN"), validateRequest(ClassValidation.createSection), ClassController.createSection);
router.patch("/sections/:id", auth("ADMIN"), ClassController.updateSection);
router.delete("/sections/:id", auth("ADMIN"), ClassController.deleteSection);

export const ClassRouter = router;
