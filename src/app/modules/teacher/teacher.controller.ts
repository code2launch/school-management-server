import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { TeacherService } from "./teacher.service";
import pick from "../../shared/pick";
import { PAGINATION_FIELDS } from "../../constants";

const createTeacher = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherService.createTeacher(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Teacher created successfully.",
    data: result,
  });
});

const getAllTeachers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "isActive"]) as {
    searchTerm?: string;
    isActive?: string;
  };

  const options = pick(req.query, PAGINATION_FIELDS);

  const result = await TeacherService.getAllTeachers(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teachers fetched.",
    meta: result.meta,
    data: result.data,
  });
});

const getTeacherById = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherService.getTeacherById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher fetched.",
    data: result,
  });
});

const updateTeacher = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherService.updateTeacher(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher updated.",
    data: result,
  });
});

const deleteTeacher = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherService.deleteTeacher(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher deleted.",
    data: result,
  });
});

const assignSubjects = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherService.assignSubjects(
    req.params.id,
    req.body.subjectIds,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subjects assigned.",
    data: result,
  });
});

const getTeacherSubjects = catchAsync(async (req: Request, res: Response) => {
  const result = await TeacherService.getTeacherSubjects(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Teacher subjects fetched.",
    data: result,
  });
});

export const TeacherController = {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignSubjects,
  getTeacherSubjects,
};
