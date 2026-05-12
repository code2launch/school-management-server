import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { paginationHelpers } from "../../helper/paginationHelper";

// ======================================================
// TYPES
// ======================================================

type AdmitStudentPayload = {
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
};

type StudentFilters = {
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
  searchTerm?: string;
  isActive?: string;
};

type PaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
};

// ======================================================
// CONSTANTS
// ======================================================

const DEFAULT_PASSWORD = "school@123";

// ======================================================
// HELPERS
// ======================================================

const generateStudentCode = async (year: number) => {
  const latestStudent = await prisma.student.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      studentId: true,
    },
  });

  let nextNumber = 1;

  if (latestStudent?.studentId) {
    const parts = latestStudent.studentId.split("-");
    const lastNumber = Number(parts[2]);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `STD-${year}-${String(nextNumber).padStart(4, "0")}`;
};

const buildStudentInclude = () => ({
  enrollments: {
    where: {
      isActive: true,
    },
    include: {
      section: {
        include: {
          class: true,
        },
      },
      academicYear: true,
    },
    take: 1,
  },
  parents: {
    where: {
      isPrimary: true,
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          relation: true,
        },
      },
    },
  },
});

// ======================================================
// ADMIT STUDENT
// ======================================================

const admitStudent = async (payload: AdmitStudentPayload) => {
  const [section, academicYear] = await Promise.all([
    prisma.section.findFirst({
      where: {
        id: payload.sectionId,
        isDeleted: false,
      },
      select: {
        id: true,
        classId: true,
      },
    }),

    prisma.academicYear.findUnique({
      where: {
        id: payload.academicYearId,
      },
      select: {
        id: true,
        year: true,
      },
    }),
  ]);

  if (!section) {
    throw new ApiError(httpStatus.NOT_FOUND, "Section not found.");
  }

  if (!academicYear) {
    throw new ApiError(httpStatus.NOT_FOUND, "Academic year not found.");
  }

  // Validate section belongs to class
  if (section.classId !== payload.classId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Section does not belong to the selected class.",
    );
  }

  // Generate student ID
  const studentId = await generateStudentCode(Number(academicYear.year));

  // Hash password outside transaction
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const createdStudentId = await prisma.$transaction(async (tx) => {
    // =========================================
    // STUDENT USER
    // =========================================

    let studentUserId: string | null = null;

    if (payload.createStudentLogin) {
      const studentUser = await tx.user.create({
        data: {
          name: payload.name,
          phone: studentId,
          password: hashedPassword,
          role: "STUDENT",
        },
        select: {
          id: true,
        },
      });

      studentUserId = studentUser.id;
    }

    // =========================================
    // STUDENT
    // =========================================

    const student = await tx.student.create({
      data: {
        studentId,
        name: payload.name,
        dob: payload.dob ? new Date(payload.dob) : undefined,
        gender: payload.gender,
        address: payload.address,
        userId: studentUserId,
      },
      select: {
        id: true,
      },
    });

    // =========================================
    // ENROLLMENT
    // =========================================

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

    // =========================================
    // PARENT
    // =========================================

    if (payload.parentName && payload.parentPhone) {
      let parent = await tx.parent.findUnique({
        where: {
          phone: payload.parentPhone,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      // Create parent if not exists
      if (!parent) {
        let parentUserId: string | null = null;

        if (payload.createParentLogin) {
          const parentUser = await tx.user.create({
            data: {
              name: payload.parentName,
              phone: payload.parentPhone,
              password: hashedPassword,
              role: "PARENT",
            },
            select: {
              id: true,
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
          select: {
            id: true,
            userId: true,
          },
        });
      }

      // Prevent duplicate mapping
      const existingRelation = await tx.studentParent.findFirst({
        where: {
          studentId: student.id,
          parentId: parent.id,
        },
      });

      if (!existingRelation) {
        await tx.studentParent.create({
          data: {
            studentId: student.id,
            parentId: parent.id,
            isPrimary: true,
          },
        });
      }
    }

    return student.id;
  });

  return prisma.student.findUnique({
    where: {
      id: createdStudentId,
    },
    include: buildStudentInclude(),
  });
};

// ======================================================
// GET ALL STUDENTS
// ======================================================

const getAllStudents = async (
  filters: StudentFilters,
  pagination: PaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(pagination);

  const where: any = {
    isDeleted: false,
  };

  // =========================================
  // FILTERS
  // =========================================

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === "true";
  }

  if (filters.searchTerm) {
    where.OR = [
      {
        name: {
          contains: filters.searchTerm,
          mode: "insensitive",
        },
      },
      {
        studentId: {
          contains: filters.searchTerm,
          mode: "insensitive",
        },
      },
    ];
  }

  // =========================================
  // ENROLLMENT FILTER
  // =========================================

  const enrollmentFilter: any = {
    isActive: true,
  };

  if (filters.classId) {
    enrollmentFilter.classId = filters.classId;
  }

  if (filters.sectionId) {
    enrollmentFilter.sectionId = filters.sectionId;
  }

  if (filters.academicYearId) {
    enrollmentFilter.academicYearId = filters.academicYearId;
  }

  if (filters.classId || filters.sectionId || filters.academicYearId) {
    where.enrollments = {
      some: enrollmentFilter,
    };
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy
        ? {
            [sortBy]: sortOrder || "asc",
          }
        : {
            createdAt: "desc",
          },

      include: buildStudentInclude(),
    }),

    prisma.student.count({
      where,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: students,
  };
};

// ======================================================
// GET SINGLE STUDENT
// ======================================================

const getStudentById = async (id: string) => {
  const student = await prisma.student.findFirst({
    where: {
      id,
      isDeleted: false,
    },

    include: {
      enrollments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          section: {
            include: {
              class: true,
            },
          },
          academicYear: true,
        },
      },

      parents: {
        include: {
          parent: true,
        },
      },

      _count: {
        select: {
          attendances: true,
          examResults: true,
          feePayments: true,
        },
      },
    },
  });

  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");
  }

  return student;
};

// ======================================================
// UPDATE STUDENT
// ======================================================

const updateStudent = async (
  id: string,
  payload: {
    name?: string;
    dob?: string;
    gender?: string;
    address?: string;
    isActive?: boolean;
  },
) => {
  const student = await prisma.student.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");
  }

  return prisma.student.update({
    where: {
      id,
    },

    data: {
      ...(payload.name && { name: payload.name }),
      ...(payload.gender && { gender: payload.gender }),
      ...(payload.address && { address: payload.address }),
      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
      ...(payload.dob && {
        dob: new Date(payload.dob),
      }),
    },
  });
};

// ======================================================
// DELETE STUDENT (SOFT DELETE)
// ======================================================

const deleteStudent = async (id: string) => {
  const student = await prisma.student.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");
  }

  return prisma.$transaction(async (tx) => {
    // Soft delete student
    await tx.student.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    // Disable user account
    if (student.userId) {
      await tx.user.update({
        where: {
          id: student.userId,
        },
        data: {
          isDeleted: true,
          isActive: false,
        },
      });
    }

    return null;
  });
};

// ======================================================
// PROMOTE STUDENTS
// ======================================================

const promoteStudents = async (payload: {
  studentIds: string[];
  fromSectionId: string;
  toClassId: string;
  toSectionId: string;
  toAcademicYearId: string;
}) => {
  const targetSection = await prisma.section.findFirst({
    where: {
      id: payload.toSectionId,
      classId: payload.toClassId,
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  if (!targetSection) {
    throw new ApiError(httpStatus.NOT_FOUND, "Target section not found.");
  }

  return prisma.$transaction(async (tx) => {
    for (const studentId of payload.studentIds) {
      // Deactivate old enrollment
      await tx.enrollment.updateMany({
        where: {
          studentId,
          sectionId: payload.fromSectionId,
          isActive: true,
        },

        data: {
          isActive: false,
          isPromoted: true,
        },
      });

      // Check existing enrollment
      const existing = await tx.enrollment.findFirst({
        where: {
          studentId,
          academicYearId: payload.toAcademicYearId,
        },
      });

      if (!existing) {
        await tx.enrollment.create({
          data: {
            studentId,
            classId: payload.toClassId,
            sectionId: payload.toSectionId,
            academicYearId: payload.toAcademicYearId,
            isActive: true,
          },
        });
      }
    }

    return {
      promoted: payload.studentIds.length,
    };
  });
};

// ======================================================
// TRANSFER SECTION
// ======================================================

const transferSection = async (payload: {
  studentId: string;
  newSectionId: string;
  academicYearId: string;
}) => {
  const newSection = await prisma.section.findFirst({
    where: {
      id: payload.newSectionId,
      isDeleted: false,
    },

    select: {
      id: true,
      classId: true,
    },
  });

  if (!newSection) {
    throw new ApiError(httpStatus.NOT_FOUND, "New section not found.");
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: payload.studentId,
      academicYearId: payload.academicYearId,
      isActive: true,
    },

    select: {
      id: true,
    },
  });

  if (!enrollment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Active enrollment not found.");
  }

  return prisma.enrollment.update({
    where: {
      id: enrollment.id,
    },

    data: {
      sectionId: payload.newSectionId,
      classId: newSection.classId,
    },
  });
};

// ======================================================
// GET STUDENTS BY PARENT
// ======================================================

const getStudentsByParent = async (parentId: string) => {
  const parent = await prisma.parent.findFirst({
    where: {
      id: parentId,
      isDeleted: false,
    },

    include: {
      children: {
        include: {
          student: {
            include: buildStudentInclude(),
          },
        },
      },
    },
  });

  if (!parent) {
    throw new ApiError(httpStatus.NOT_FOUND, "Parent not found.");
  }

  return parent;
};

// ======================================================
// EXPORTS
// ======================================================

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
