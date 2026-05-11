import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const { id, role } = req.user!;
  let result: any = null;

  if (role === "ADMIN" || role === "SUPPORT_STAFF") {
    result = await DashboardService.getAdminDashboard();
  } else if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId: id } });
    if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher profile not found.");
    result = await DashboardService.getTeacherDashboard(teacher.id);
  } else if (role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: id } });
    if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student profile not found.");
    result = await DashboardService.getStudentDashboard(student.id);
  } else if (role === "PARENT") {
    const parent = await prisma.parent.findUnique({ where: { userId: id } });
    if (!parent) throw new ApiError(httpStatus.NOT_FOUND, "Parent profile not found.");
    result = await DashboardService.getParentDashboard(parent.id);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard data fetched.",
    data: result,
  });
});

// Explicit endpoints for admin to view any role's dashboard
const getAdminDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAdminDashboard();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Admin dashboard.", data: result });
});

const getTeacherDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getTeacherDashboard(req.params.teacherId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Teacher dashboard.", data: result });
});

const getStudentDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getStudentDashboard(req.params.studentId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Student dashboard.", data: result });
});

export const DashboardController = {
  getDashboard, getAdminDashboard, getTeacherDashboard, getStudentDashboard,
};
