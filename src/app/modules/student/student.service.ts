import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { generateStudentId } from "../../constants";
import { paginationHelpers } from "../../helper/paginationHelper";

// ── Admission ─────────────────────────────────────────────────

const admitStudent = async (payload: {
  name: string;
  dob?: string;
  gender?: string;
  address?: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  rollNumber?: string;
  parentName?: string;
  parentPhone?: string;
  parentRelation?: string;
  createParentLogin?: boolean;
  createStudentLogin?: boolean;
}) => {
  const [section, academicYear] = await Promise.all([
    prisma.section.findFirst({ where: { id: payload.sectionId, isDeleted: false } }),
    prisma.academicYear.findUnique({ where: { id: payload.academicYearId } }),
  ]);
  if (!section) throw new ApiError(httpStatus.NOT_FOUND, "Section not found.");
  if (!academicYear) throw new ApiError(httpStatus.NOT_FOUND, "Academic year not found.");

  // Generate sequential student ID
  const count = await prisma.student.count();
  const studentId = generateStudentId(Number(academicYear.year), count + 1);

  return prisma.$transaction(async (tx) => {
    // Create student user account (optional)
    let studentUserId: string | undefined;
    if (payload.createStudentLogin) {
      const defaultPhone = `STD${String(count + 1).padStart(6, "0")}`;
      const studentUser = await tx.user.create({
        data: {
          name: payload.name,
          phone: defaultPhone,
          password: await bcrypt.hash("school@123", 10),
          role: "STUDENT",
        },
      });
      studentUserId = studentUser.id;
    }

    // Create student
    const student = await tx.student.create({
      data: {
        studentId,
        name: payload.name,
        dob: payload.dob ? new Date(payload.dob) : undefined,
        gender: payload.gender,
        address: payload.address,
        userId: studentUserId,
      },
    });

    // Enrollment
    await tx.enrollment.create({
      data: {
        studentId: student.id,
        classId: payload.classId,
        sectionId: payload.sectionId,
        academicYearId: payload.academicYearId,
        rollNumber: payload.rollNumber,
        isActive: true,
      },
    });

    // Parent linkage
    if (payload.parentName && payload.parentPhone) {
      let parent = await tx.parent.findFirst({
        where: { phone: payload.parentPhone, isDeleted: false },
      });

      if (!parent) {
        let parentUserId: string | undefined;
        if (payload.createParentLogin) {
          const parentUser = await tx.user.create({
            data: {
              name: payload.parentName,
              phone: payload.parentPhone,
              password: await bcrypt.hash("school@123", 10),
              role: "PARENT",
            },
          });
          parentUserId = parentUser.id;
        }
        parent = await tx.parent.create({
          data: {
            name: payload.parentName,
            phone: payload.parentPhone,
            relation: payload.parentRelation,
            userId: parentUserId,
          },
        });
      }

      await tx.studentParent.create({
        data: { studentId: student.id, parentId: parent.id, isPrimary: true },
      });
    }

    return tx.student.findUnique({
      where: { id: student.id },
      include: {
        enrollments: {
          include: {
            section: { include: { class: true } },
            academicYear: true,
          },
        },
        parents: { include: { parent: true } },
      },
    });
  });
};

// ── Query ─────────────────────────────────────────────────────

const getAllStudents = async (
  filters: {
    classId?: string;
    sectionId?: string;
    academicYearId?: string;
    searchTerm?: string;
    isActive?: string;
  },
  pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: string }
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(pagination);

  const where: any = { isDeleted: false };

  if (filters.isActive !== undefined) where.isActive = filters.isActive === "true";

  if (filters.searchTerm) {
    where.OR = [
      { name: { contains: filters.searchTerm, mode: "insensitive" } },
      { studentId: { contains: filters.searchTerm, mode: "insensitive" } },
    ];
  }

  // Filter by class/section via enrollments
  const enrollmentFilter: any = {};
  if (filters.academicYearId) enrollmentFilter.academicYearId = filters.academicYearId;
  if (filters.classId) enrollmentFilter.classId = filters.classId;
  if (filters.sectionId) enrollmentFilter.sectionId = filters.sectionId;

  if (Object.keys(enrollmentFilter).length > 0) {
    enrollmentFilter.isActive = true;
    where.enrollments = { some: enrollmentFilter };
  }

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder || "asc" } : { createdAt: "desc" },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            section: { include: { class: true } },
            academicYear: true,
          },
          take: 1,
        },
        parents: {
          where: { isPrimary: true },
          include: { parent: { select: { name: true, phone: true } } },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  return { meta: { page, limit, total }, data };
};

const getStudentById = async (id: string) => {
  const student = await prisma.student.findFirst({
    where: { id, isDeleted: false },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          section: { include: { class: true } },
          academicYear: true,
        },
      },
      parents: { include: { parent: true } },
      _count: {
        select: { attendances: true, examResults: true, feePayments: true },
      },
    },
  });
  if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");
  return student;
};

const updateStudent = async (
  id: string,
  payload: { name?: string; dob?: string; gender?: string; address?: string; isActive?: boolean }
) => {
  const student = await prisma.student.findFirst({ where: { id, isDeleted: false } });
  if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");

  return prisma.student.update({
    where: { id },
    data: {
      ...payload,
      dob: payload.dob ? new Date(payload.dob) : undefined,
    },
  });
};

const deleteStudent = async (id: string) => {
  const student = await prisma.student.findFirst({ where: { id, isDeleted: false } });
  if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");
  return prisma.student.update({ where: { id }, data: { isDeleted: true, isActive: false } });
};

// ── Year-end Promotion ────────────────────────────────────────

const promoteStudents = async (payload: {
  studentIds: string[];
  fromSectionId: string;
  toClassId: string;
  toSectionId: string;
  toAcademicYearId: string;
}) => {
  const [toSection, toYear] = await Promise.all([
    prisma.section.findFirst({ where: { id: payload.toSectionId, classId: payload.toClassId } }),
    prisma.academicYear.findUnique({ where: { id: payload.toAcademicYearId } }),
  ]);
  if (!toSection) throw new ApiError(httpStatus.NOT_FOUND, "Target section not found.");
  if (!toYear) throw new ApiError(httpStatus.NOT_FOUND, "Target academic year not found.");

  return prisma.$transaction(async (tx) => {
    const results = await Promise.all(
      payload.studentIds.map(async (studentId) => {
        // Deactivate old enrollment
        await tx.enrollment.updateMany({
          where: { studentId, sectionId: payload.fromSectionId, isActive: true },
          data: { isActive: false, isPromoted: true },
        });

        // Check if enrollment already exists for target year
        const existing = await tx.enrollment.findFirst({
          where: { studentId, academicYearId: payload.toAcademicYearId },
        });
        if (existing) return existing;

        // Create new enrollment
        return tx.enrollment.create({
          data: {
            studentId,
            classId: payload.toClassId,
            sectionId: payload.toSectionId,
            academicYearId: payload.toAcademicYearId,
            isActive: true,
          },
        });
      })
    );
    return { promoted: results.length, enrollments: results };
  });
};

const transferSection = async (payload: {
  studentId: string;
  newSectionId: string;
  academicYearId: string;
}) => {
  const newSection = await prisma.section.findFirst({
    where: { id: payload.newSectionId, isDeleted: false },
    include: { class: true },
  });
  if (!newSection) throw new ApiError(httpStatus.NOT_FOUND, "New section not found.");

  const currentEnrollment = await prisma.enrollment.findFirst({
    where: { studentId: payload.studentId, academicYearId: payload.academicYearId, isActive: true },
  });
  if (!currentEnrollment)
    throw new ApiError(httpStatus.NOT_FOUND, "Active enrollment not found for this student.");

  return prisma.enrollment.update({
    where: { id: currentEnrollment.id },
    data: { sectionId: payload.newSectionId, classId: newSection.classId },
  });
};

// ── Parent ────────────────────────────────────────────────────

const getStudentsByParent = async (parentId: string) => {
  const parent = await prisma.parent.findFirst({
    where: { id: parentId, isDeleted: false },
    include: {
      children: {
        include: {
          student: {
            include: {
              enrollments: {
                where: { isActive: true },
                include: { section: { include: { class: true } }, academicYear: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!parent) throw new ApiError(httpStatus.NOT_FOUND, "Parent not found.");
  return parent;
};

export const StudentService = {
  admitStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  promoteStudents,
  transferSection,
  getStudentsByParent,
};
