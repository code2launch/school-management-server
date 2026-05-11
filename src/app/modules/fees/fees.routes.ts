import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { FeesController } from "./fees.controller";
import { FeesValidation } from "./fees.validation";

const router = Router();

// Fee structure
router.get("/structures", auth("ADMIN", "TEACHER"), FeesController.getFeeStructures);
router.post("/structures", auth("ADMIN"), validateRequest(FeesValidation.createFeeStructure), FeesController.createFeeStructure);
router.patch("/structures/:id", auth("ADMIN"), FeesController.updateFeeStructure);

// Payments
router.post("/payments", auth("ADMIN"), validateRequest(FeesValidation.recordPayment), FeesController.recordPayment);
router.get("/payments/dues", auth("ADMIN"), FeesController.getPendingDues);
router.get("/payments/report", auth("ADMIN"), FeesController.getFeeCollectionReport);
router.get("/payments/receipt/:receiptNumber", auth("ADMIN", "STUDENT", "PARENT"), FeesController.getReceipt);
router.get("/payments/student/:studentId", auth("ADMIN", "STUDENT", "PARENT"), FeesController.getStudentPayments);

export const FeesRouter = router;
