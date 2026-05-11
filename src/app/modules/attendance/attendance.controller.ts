import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AttendanceService } from "./attendance.service";

const markStudentAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.markStudentAttendance({
    ...req.body,
    takenByTeacherId: req.user?.role === "TEACHER" ? req.user.id : undefined,
  });
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Attendance marked.", data: result });
});

const getAttendanceByDate = catchAsync(async (req: Request, res: Response) => {
  const { sectionId, date, academicYearId } = req.query as Record<string, string>;
  const result = await AttendanceService.getAttendanceByDate(sectionId, date, academicYearId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Attendance fetched.", data: result });
});

const getMonthlyAttendance = catchAsync(async (req: Request, res: Response) => {
  const { sectionId, academicYearId, month, year } = req.query as Record<string, string>;
  const result = await AttendanceService.getMonthlyAttendance(
    sectionId, academicYearId, Number(month), Number(year)
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Monthly attendance fetched.", data: result });
});

const getStudentAttendanceSummary = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, month, year } = req.query as Record<string, string>;
  const result = await AttendanceService.getStudentAttendanceSummary(
    req.params.studentId, academicYearId, month ? Number(month) : undefined, year ? Number(year) : undefined
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Attendance summary fetched.", data: result });
});

const getTodaySummary = catchAsync(async (req: Request, res: Response) => {
  const { sectionId, academicYearId } = req.query as Record<string, string>;
  const result = await AttendanceService.getTodayAttendanceSummary(sectionId, academicYearId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Today's attendance summary.", data: result });
});

const markTeacherAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await AttendanceService.markTeacherAttendance(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Teacher attendance marked.", data: result });
});

const getTeacherAttendanceByMonth = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, month, year } = req.query as Record<string, string>;
  const result = await AttendanceService.getTeacherAttendanceByMonth(
    req.params.teacherId, academicYearId, Number(month), Number(year)
  );
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Teacher monthly attendance.", data: result });
});

export const AttendanceController = {
  markStudentAttendance, getAttendanceByDate, getMonthlyAttendance,
  getStudentAttendanceSummary, getTodaySummary,
  markTeacherAttendance, getTeacherAttendanceByMonth,
};
