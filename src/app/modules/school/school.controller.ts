import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SchoolService } from "./school.service";

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.getProfile();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School profile fetched.", data: result });
});

const upsertProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.upsertProfile(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "School profile updated.", data: result });
});

const getAllAcademicYears = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.getAllAcademicYears();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Academic years fetched.", data: result });
});

const createAcademicYear = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.createAcademicYear(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Academic year created.", data: result });
});

const setCurrentYear = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.setCurrentYear(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Current academic year updated.", data: result });
});

const getCurrentYear = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolService.getCurrentYear();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Current academic year fetched.", data: result });
});

export const SchoolController = {
  getProfile, upsertProfile,
  getAllAcademicYears, createAcademicYear, setCurrentYear, getCurrentYear,
};
