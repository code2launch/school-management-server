import { Router } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { NoticeController } from "./notice.controller";
import { NoticeValidation } from "./notice.validation";

const router = Router();

// Public feed (role-filtered)
router.get("/feed", auth(), NoticeController.getPublicNotices);

// Admin + Teacher management
router.get("/", auth("ADMIN", "TEACHER"), NoticeController.getAllNotices);
router.post(
  "/",
  auth("ADMIN", "TEACHER"),
  validateRequest(NoticeValidation.createNotice),
  NoticeController.createNotice
);
router.get("/:id", auth(), NoticeController.getNoticeById);
router.patch(
  "/:id",
  auth("ADMIN", "TEACHER"),
  validateRequest(NoticeValidation.updateNotice),
  NoticeController.updateNotice
);
router.delete("/:id", auth("ADMIN"), NoticeController.deleteNotice);

export const NoticeRouter = router;
