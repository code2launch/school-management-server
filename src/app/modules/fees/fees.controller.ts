import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { FeesService } from "./fees.service";

const createFeeStructure = catchAsync(async (req: Request, res: Response) => {
  const result = await FeesService.createFeeStructure(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Fee structure created.", data: result });
});

const getFeeStructures = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, classId } = req.query as Record<string, string>;
  const result = await FeesService.getFeeStructures(academicYearId, classId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Fee structures fetched.", data: result });
});

const updateFeeStructure = catchAsync(async (req: Request, res: Response) => {
  const result = await FeesService.updateFeeStructure(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Fee structure updated.", data: result });
});

const recordPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await FeesService.recordPayment(req.body, req.user?.id);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Payment recorded.", data: result });
});

const getStudentPayments = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId } = req.query as Record<string, string>;
  const result = await FeesService.getStudentPayments(req.params.studentId, academicYearId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student payments fetched.", data: result });
});

const getPendingDues = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, classId, sectionId } = req.query as Record<string, string>;
  const result = await FeesService.getPendingDues(academicYearId, classId, sectionId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Pending dues fetched.", data: result });
});

const getReceipt = catchAsync(async (req: Request, res: Response) => {
  const result = await FeesService.getReceipt(req.params.receiptNumber);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Receipt fetched.", data: result });
});

const getFeeCollectionReport = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, month, year } = req.query as Record<string, string>;
  const result = await FeesService.getFeeCollectionReport(
    academicYearId, month ? Number(month) : undefined, year ? Number(year) : undefined
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Fee collection report.", data: result });
});

export const FeesController = {
  createFeeStructure, getFeeStructures, updateFeeStructure,
  recordPayment, getStudentPayments, getPendingDues,
  getReceipt, getFeeCollectionReport,
};
