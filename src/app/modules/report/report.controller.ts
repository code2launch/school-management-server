import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ReportService } from "./report.service";

const getAttendanceReport = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, sectionId, classId, month, year } = req.query as Record<string, string>;
  const result = await ReportService.getAttendanceReport({
    academicYearId,
    sectionId,
    classId,
    month: Number(month),
    year: Number(year),
  });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Attendance report generated.", data: result });
});

const getFeeCollectionReport = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, classId, month, year } = req.query as Record<string, string>;
  const result = await ReportService.getFeeCollectionReport({
    academicYearId,
    classId,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
  });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Fee collection report generated.", data: result });
});

const getStudentListByClass = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, classId, sectionId } = req.query as Record<string, string>;
  const result = await ReportService.getStudentListByClass({ academicYearId, classId, sectionId });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student list generated.", data: result });
});

const getResultSheetReport = catchAsync(async (req: Request, res: Response) => {
  const { classId, sectionId } = req.query as Record<string, string>;
  const result = await ReportService.getResultSheetReport({
    examId: req.params.examId,
    classId,
    sectionId,
  });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Result sheet report generated.", data: result });
});

export const ReportController = {
  getAttendanceReport,
  getFeeCollectionReport,
  getStudentListByClass,
  getResultSheetReport,
};
