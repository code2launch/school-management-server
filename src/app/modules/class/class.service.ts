import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const createClass = async (payload: { name: string; numericValue: number }) => {
  const exists = await prisma.class.findFirst({ where: { numericValue: payload.numericValue, isDeleted: false } });
  if (exists) throw new ApiError(httpStatus.CONFLICT, "Class with this numeric value already exists.");
  return prisma.class.create({ data: payload });
};

const getAllClasses = async () => {
  return prisma.class.findMany({
    where: { isDeleted: false },
    orderBy: { numericValue: "asc" },
    include: {
      sections: { where: { isDeleted: false }, orderBy: { name: "asc" } },
      _count: { select: { subjects: true } },
    },
  });
};

const getClassById = async (id: string) => {
  const cls = await prisma.class.findFirst({
    where: { id, isDeleted: false },
    include: {
      sections: { where: { isDeleted: false } },
      subjects: {
        where: { isDeleted: false },
        include: { teacherAssignments: { include: { teacher: { select: { id: true, name: true } } } } },
      },
    },
  });
  if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found.");
  return cls;
};

const updateClass = async (id: string, payload: { name?: string; isActive?: boolean }) => {
  const cls = await prisma.class.findFirst({ where: { id, isDeleted: false } });
  if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found.");
  return prisma.class.update({ where: { id }, data: payload });
};

const deleteClass = async (id: string) => {
  const cls = await prisma.class.findFirst({ where: { id, isDeleted: false } });
  if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found.");
  const hasStudents = await prisma.enrollment.count({ where: { classId: id, isActive: true } });
  if (hasStudents) throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete class with active enrollments.");
  return prisma.class.update({ where: { id }, data: { isDeleted: true } });
};

// ── Sections ──────────────────────────────────────────────────

const createSection = async (payload: { name: string; classId: string }) => {
  const cls = await prisma.class.findFirst({ where: { id: payload.classId, isDeleted: false } });
  if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found.");
  const exists = await prisma.section.findFirst({
    where: { classId: payload.classId, name: payload.name.toUpperCase(), isDeleted: false },
  });
  if (exists) throw new ApiError(httpStatus.CONFLICT, "Section already exists in this class.");
  return prisma.section.create({ data: { name: payload.name.toUpperCase(), classId: payload.classId } });
};

const getSectionsByClass = async (classId: string) => {
  return prisma.section.findMany({
    where: { classId, isDeleted: false },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { enrollments: true } },
    },
  });
};

const updateSection = async (id: string, payload: { name?: string; isActive?: boolean }) => {
  const section = await prisma.section.findFirst({ where: { id, isDeleted: false } });
  if (!section) throw new ApiError(httpStatus.NOT_FOUND, "Section not found.");
  return prisma.section.update({ where: { id }, data: payload });
};

const deleteSection = async (id: string) => {
  const section = await prisma.section.findFirst({ where: { id, isDeleted: false } });
  if (!section) throw new ApiError(httpStatus.NOT_FOUND, "Section not found.");
  const hasStudents = await prisma.enrollment.count({ where: { sectionId: id, isActive: true } });
  if (hasStudents) throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete section with active students.");
  return prisma.section.update({ where: { id }, data: { isDeleted: true } });
};

export const ClassService = {
  createClass, getAllClasses, getClassById, updateClass, deleteClass,
  createSection, getSectionsByClass, updateSection, deleteSection,
};
