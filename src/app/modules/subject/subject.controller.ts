import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SubjectService } from "./subject.service";

const createSubject = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.createSubject(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Subject created.", data: result });
});
const getSubjectsByClass = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.getSubjectsByClass(req.params.classId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Subjects fetched.", data: result });
});
const updateSubject = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.updateSubject(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Subject updated.", data: result });
});
const deleteSubject = catchAsync(async (req: Request, res: Response) => {
  await SubjectService.deleteSubject(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Subject deleted.", data: null });
});
const assignTeacher = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.assignTeacher(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Teacher assigned.", data: result });
});
const removeTeacherAssignment = catchAsync(async (req: Request, res: Response) => {
  await SubjectService.removeTeacherAssignment(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Assignment removed.", data: null });
});
const createRoutineSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.createRoutineSlot(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Routine slot saved.", data: result });
});
const getRoutineBySection = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.getRoutineBySection(req.params.sectionId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Routine fetched.", data: result });
});
const deleteRoutineSlot = catchAsync(async (req: Request, res: Response) => {
  await SubjectService.deleteRoutineSlot(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Slot deleted.", data: null });
});

export const SubjectController = {
  createSubject, getSubjectsByClass, updateSubject, deleteSubject,
  assignTeacher, removeTeacherAssignment,
  createRoutineSlot, getRoutineBySection, deleteRoutineSlot,
};
