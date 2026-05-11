import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { generateTeacherId } from "../../constants";
import { paginationHelpers } from "../../helper/paginationHelper";

const createTeacher = async (payload: {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  address?: string;
  joinDate?: string;
  password?: string;
}) => {
  const existingUser = await prisma.user.findUnique({ where: { phone: payload.phone } });
  if (existingUser) throw new ApiError(httpStatus.CONFLICT, "Phone number already in use.");

  const year = new Date().getFullYear();
  const count = await prisma.teacher.count();
  const employeeId = generateTeacherId(year, count + 1);

  const password = payload.password || "teacher@123";
  const hashed = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: payload.name, phone: payload.phone, password: hashed, role: "TEACHER" },
    });
    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        employeeId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        gender: payload.gender,
        address: payload.address,
        joinDate: payload.joinDate ? new Date(payload.joinDate) : undefined,
      },
    });
    return teacher;
  });

  return result;
};

const getAllTeachers = async (options: { page?: number; limit?: number; searchTerm?: string }) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination({
    page: options.page,
    limit: options.limit,
  });

  const where: any = { isDeleted: false };
  if (options.searchTerm) {
    where.OR = [
      { name: { contains: options.searchTerm, mode: "insensitive" } },
      { phone: { contains: options.searchTerm } },
      { employeeId: { contains: options.searchTerm, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        subjectAssignments: {
          include: { subject: { select: { name: true, class: { select: { name: true } } } } },
        },
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const getTeacherById = async (id: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id, isDeleted: false },
    include: {
      subjectAssignments: {
        include: {
          subject: { include: { class: { select: { name: true } } } },
        },
      },
      routineSlots: {
        include: { section: { include: { class: true } }, subject: true },
        orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
      },
    },
  });
  if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  return teacher;
};

const updateTeacher = async (
  id: string,
  payload: { name?: string; email?: string; gender?: string; address?: string; isActive?: boolean }
) => {
  const teacher = await prisma.teacher.findFirst({ where: { id, isDeleted: false } });
  if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.teacher.update({ where: { id }, data: payload });
    if (payload.name && teacher.userId) {
      await tx.user.update({ where: { id: teacher.userId }, data: { name: payload.name } });
    }
    if (typeof payload.isActive === "boolean" && teacher.userId) {
      await tx.user.update({ where: { id: teacher.userId }, data: { isActive: payload.isActive } });
    }
    return updated;
  });
};

const deleteTeacher = async (id: string) => {
  const teacher = await prisma.teacher.findFirst({ where: { id, isDeleted: false } });
  if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  return prisma.$transaction(async (tx) => {
    await tx.teacher.update({ where: { id }, data: { isDeleted: true, isActive: false } });
    if (teacher.userId) {
      await tx.user.update({ where: { id: teacher.userId }, data: { isDeleted: true, isActive: false } });
    }
  });
};

const getTeacherSubjects = async (teacherId: string) => {
  return prisma.teacherSubjectAssignment.findMany({
    where: { teacherId },
    include: {
      subject: { include: { class: { select: { name: true, numericValue: true } } } },
    },
  });
};

const assignSubjects = async (teacherId: string, subjectIds: string[]) => {
  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, isDeleted: false } });
  if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");

  // Upsert each assignment
  const results = await Promise.all(
    subjectIds.map((subjectId) =>
      prisma.teacherSubjectAssignment.upsert({
        where: { teacherId_subjectId: { teacherId, subjectId } },
        create: { teacherId, subjectId },
        update: {},
        include: { subject: { select: { name: true } } },
      })
    )
  );
  return results;
};

export const TeacherService = {
  createTeacher, getAllTeachers, getTeacherById, updateTeacher, deleteTeacher,
  getTeacherSubjects, assignSubjects,
};
