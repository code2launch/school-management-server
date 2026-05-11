import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { StudentService } from "./student.service";
import { PAGINATION_FIELDS } from "../../constants";
import pick from "../../shared/pick";

const admitStudent = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentService.admitStudent(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Student admitted successfully.", data: result });
});

const getAllStudents = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["classId", "sectionId", "academicYearId", "searchTerm", "isActive"]);
  const pagination = pick(req.query, PAGINATION_FIELDS);
  const result = await StudentService.getAllStudents(filters as any, pagination as any);
  sendResponse(res, {
    statusCode: httpStatus.OK, success: true, message: "Students fetched.",
    meta: result.meta, data: result.data,
  });
});

const getStudentById = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentService.getStudentById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student fetched.", data: result });
});

const updateStudent = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentService.updateStudent(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student updated.", data: result });
});

const deleteStudent = catchAsync(async (req: Request, res: Response) => {
  await StudentService.deleteStudent(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student removed.", data: null });
});

const promoteStudents = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentService.promoteStudents(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: `${result.promoted} students promoted.`, data: result });
});

const transferSection = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentService.transferSection(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student transferred.", data: result });
});

const getStudentsByParent = catchAsync(async (req: Request, res: Response) => {
  const result = await StudentService.getStudentsByParent(req.params.parentId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Parent's students fetched.", data: result });
});

export const StudentController = {
  admitStudent, getAllStudents, getStudentById, updateStudent, deleteStudent,
  promoteStudents, transferSection, getStudentsByParent,
};
