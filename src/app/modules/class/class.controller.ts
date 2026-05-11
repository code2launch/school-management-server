import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ClassService } from "./class.service";

const createClass = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.createClass(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Class created.", data: result });
});
const getAllClasses = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.getAllClasses();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Classes fetched.", data: result });
});
const getClassById = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.getClassById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Class fetched.", data: result });
});
const updateClass = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.updateClass(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Class updated.", data: result });
});
const deleteClass = catchAsync(async (req: Request, res: Response) => {
  await ClassService.deleteClass(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Class deleted.", data: null });
});

const createSection = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.createSection(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Section created.", data: result });
});
const getSectionsByClass = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.getSectionsByClass(req.params.classId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Sections fetched.", data: result });
});
const updateSection = catchAsync(async (req: Request, res: Response) => {
  const result = await ClassService.updateSection(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Section updated.", data: result });
});
const deleteSection = catchAsync(async (req: Request, res: Response) => {
  await ClassService.deleteSection(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Section deleted.", data: null });
});

export const ClassController = {
  createClass, getAllClasses, getClassById, updateClass, deleteClass,
  createSection, getSectionsByClass, updateSection, deleteSection,
};
