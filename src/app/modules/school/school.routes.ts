import { Router } from "express";
import { SchoolController } from "./school.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { SchoolValidation } from "./school.validation";

const router = Router();

router.get("/profile", SchoolController.getProfile);
router.put("/profile", auth("ADMIN"), validateRequest(SchoolValidation.updateProfile), SchoolController.upsertProfile);

router.get("/academic-years", SchoolController.getAllAcademicYears);
router.get("/academic-years/current", SchoolController.getCurrentYear);
router.post("/academic-years", auth("ADMIN"), validateRequest(SchoolValidation.createAcademicYear), SchoolController.createAcademicYear);
router.patch("/academic-years/:id/set-current", auth("ADMIN"), SchoolController.setCurrentYear);

export const SchoolRouter = router;
