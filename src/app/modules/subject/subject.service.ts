import httpStatus from "http-status";
import { DayOfWeek } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const createSubject = async (payload: { name: string; code?: string; classId: string }) => {
  const cls = await prisma.class.findFirst({ where: { id: payload.classId, isDeleted: false } });
  if (!cls) throw new ApiError(httpStatus.NOT_FOUND, "Class not found.");
  const exists = await prisma.subject.findFirst({
    where: { classId: payload.classId, name: payload.name, isDeleted: false },
  });
  if (exists) throw new ApiError(httpStatus.CONFLICT, "Subject already exists for this class.");
  return prisma.subject.create({ data: payload });
};

const getSubjectsByClass = async (classId: string) => {
  return prisma.subject.findMany({
    where: { classId, isDeleted: false },
    orderBy: { name: "asc" },
    include: {
      teacherAssignments: {
        include: { teacher: { select: { id: true, name: true, employeeId: true } } },
      },
    },
  });
};

const updateSubject = async (id: string, payload: { name?: string; code?: string; isActive?: boolean }) => {
  const subject = await prisma.subject.findFirst({ where: { id, isDeleted: false } });
  if (!subject) throw new ApiError(httpStatus.NOT_FOUND, "Subject not found.");
  return prisma.subject.update({ where: { id }, data: payload });
};

const deleteSubject = async (id: string) => {
  const subject = await prisma.subject.findFirst({ where: { id, isDeleted: false } });
  if (!subject) throw new ApiError(httpStatus.NOT_FOUND, "Subject not found.");
  return prisma.subject.update({ where: { id }, data: { isDeleted: true } });
};

// ── Teacher Assignment ────────────────────────────────────────

const assignTeacher = async (payload: { teacherId: string; subjectId: string; sectionId?: string }) => {
  const [teacher, subject] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: payload.teacherId, isDeleted: false } }),
    prisma.subject.findFirst({ where: { id: payload.subjectId, isDeleted: false } }),
  ]);
  if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  if (!subject) throw new ApiError(httpStatus.NOT_FOUND, "Subject not found.");

  return prisma.teacherSubjectAssignment.upsert({
    where: { teacherId_subjectId: { teacherId: payload.teacherId, subjectId: payload.subjectId } },
    create: payload,
    update: { sectionId: payload.sectionId },
    include: { teacher: { select: { name: true } }, subject: { select: { name: true } } },
  });
};

const removeTeacherAssignment = async (id: string) => {
  const assignment = await prisma.teacherSubjectAssignment.findUnique({ where: { id } });
  if (!assignment) throw new ApiError(httpStatus.NOT_FOUND, "Assignment not found.");
  return prisma.teacherSubjectAssignment.delete({ where: { id } });
};

// ── Class Routine ─────────────────────────────────────────────

const createRoutineSlot = async (payload: {
  sectionId: string;
  subjectId: string;
  teacherId?: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
}) => {
  const exists = await prisma.routineSlot.findUnique({
    where: { sectionId_dayOfWeek_periodNumber: { sectionId: payload.sectionId, dayOfWeek: payload.dayOfWeek, periodNumber: payload.periodNumber } },
  });
  if (exists) {
    return prisma.routineSlot.update({ where: { id: exists.id }, data: payload });
  }
  return prisma.routineSlot.create({ data: payload });
};

const getRoutineBySection = async (sectionId: string) => {
  const slots = await prisma.routineSlot.findMany({
    where: { sectionId },
    orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
    include: {
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  // Group by day
  const grouped: Record<string, typeof slots> = {};
  for (const slot of slots) {
    if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
    grouped[slot.dayOfWeek].push(slot);
  }
  return grouped;
};

const deleteRoutineSlot = async (id: string) => {
  const slot = await prisma.routineSlot.findUnique({ where: { id } });
  if (!slot) throw new ApiError(httpStatus.NOT_FOUND, "Routine slot not found.");
  return prisma.routineSlot.delete({ where: { id } });
};

export const SubjectService = {
  createSubject, getSubjectsByClass, updateSubject, deleteSubject,
  assignTeacher, removeTeacherAssignment,
  createRoutineSlot, getRoutineBySection, deleteRoutineSlot,
};
