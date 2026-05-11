import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

// ── School Profile ────────────────────────────────────────────

const getProfile = async () => {
  const profile = await prisma.schoolProfile.findFirst();
  return profile;
};

const upsertProfile = async (payload: {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}) => {
  const existing = await prisma.schoolProfile.findFirst();
  if (existing) {
    return prisma.schoolProfile.update({ where: { id: existing.id }, data: payload });
  }
  if (!payload.name) throw new ApiError(httpStatus.BAD_REQUEST, "School name is required.");
  return prisma.schoolProfile.create({ data: { name: payload.name, ...payload } });
};

// ── Academic Year ─────────────────────────────────────────────

const getAllAcademicYears = async () => {
  return prisma.academicYear.findMany({ orderBy: { year: "desc" } });
};

const createAcademicYear = async (payload: {
  year: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}) => {
  const exists = await prisma.academicYear.findUnique({ where: { year: payload.year } });
  if (exists) throw new ApiError(httpStatus.CONFLICT, "Academic year already exists.");

  // If this is set as current, unset previous current
  if (payload.isCurrent) {
    await prisma.academicYear.updateMany({ data: { isCurrent: false } });
  }

  return prisma.academicYear.create({
    data: {
      year: payload.year,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      isCurrent: payload.isCurrent ?? false,
    },
  });
};

const setCurrentYear = async (id: string) => {
  const year = await prisma.academicYear.findUnique({ where: { id } });
  if (!year) throw new ApiError(httpStatus.NOT_FOUND, "Academic year not found.");

  await prisma.academicYear.updateMany({ data: { isCurrent: false } });
  return prisma.academicYear.update({ where: { id }, data: { isCurrent: true } });
};

const getCurrentYear = async () => {
  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!year) throw new ApiError(httpStatus.NOT_FOUND, "No current academic year set.");
  return year;
};

export const SchoolService = {
  getProfile,
  upsertProfile,
  getAllAcademicYears,
  createAcademicYear,
  setCurrentYear,
  getCurrentYear,
};
