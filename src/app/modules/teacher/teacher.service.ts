import bcrypt from "bcrypt";
import httpStatus from "http-status";

import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { generateTeacherId } from "../../constants";
import { paginationHelpers } from "../../helper/paginationHelper";

type CreateTeacherPayload = {
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  address?: string;
  joinDate?: string;
  password?: string;
};

type UpdateTeacherPayload = {
  name?: string;
  email?: string;
  gender?: string;
  address?: string;
  isActive?: boolean;
};

const teacherBasicSelect = {
  id: true,
  employeeId: true,
  name: true,
  phone: true,
  email: true,
  gender: true,
  address: true,
  joinDate: true,
  isActive: true,
  createdAt: true,
};

const createTeacher = async (payload: CreateTeacherPayload) => {
  const existing = await prisma.user.findUnique({
    where: { phone: payload.phone },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, "Phone number already exists.");
  }

  const year = new Date().getFullYear();

  const totalTeachers = await prisma.teacher.count();

  const employeeId = generateTeacherId(year, totalTeachers + 1);

  const hashedPassword = await bcrypt.hash(
    payload.password || "teacher@123",
    10,
  );

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        password: hashedPassword,
        role: "TEACHER",
      },
      select: {
        id: true,
      },
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
      select: teacherBasicSelect,
    });

    return teacher;
  });

  return result;
};

const getAllTeachers = async (
  filters: {
    searchTerm?: string;
    isActive?: string;
  },
  paginationOptions: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  },
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const where: any = {
    isDeleted: false,
  };

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
        phone: {
          contains: filters.searchTerm,
        },
      },
      {
        employeeId: {
          contains: filters.searchTerm,
          mode: "insensitive",
        },
      },
    ];
  }

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
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

      select: {
        ...teacherBasicSelect,

        subjectAssignments: {
          select: {
            id: true,
            subject: {
              select: {
                id: true,
                name: true,
                class: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.teacher.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: teachers,
  };
};

const getTeacherById = async (id: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      id,
      isDeleted: false,
    },

    select: {
      ...teacherBasicSelect,

      subjectAssignments: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },

      routineSlots: {
        orderBy: [
          {
            dayOfWeek: "asc",
          },
          {
            periodNumber: "asc",
          },
        ],

        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          periodNumber: true,

          section: {
            select: {
              id: true,
              name: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      _count: {
        select: {
          subjectAssignments: true,
          attendances: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  }

  return teacher;
};

const updateTeacher = async (id: string, payload: UpdateTeacherPayload) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      id,
      isDeleted: false,
    },

    select: {
      id: true,
      userId: true,
    },
  });

  if (!teacher) {
    throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTeacher = await tx.teacher.update({
      where: { id },

      data: {
        name: payload.name,
        email: payload.email,
        gender: payload.gender,
        address: payload.address,
        isActive: payload.isActive,
      },

      select: teacherBasicSelect,
    });

    const userUpdateData: any = {};

    if (payload.name) {
      userUpdateData.name = payload.name;
    }

    if (typeof payload.isActive === "boolean") {
      userUpdateData.isActive = payload.isActive;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: {
          id: teacher.userId,
        },

        data: userUpdateData,
      });
    }

    return updatedTeacher;
  });

  return result;
};

const deleteTeacher = async (id: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      id,
      isDeleted: false,
    },

    select: {
      id: true,
      userId: true,
    },
  });

  if (!teacher) {
    throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacher.update({
      where: { id },

      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    await tx.user.update({
      where: {
        id: teacher.userId,
      },

      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  });

  return null;
};

const getTeacherSubjects = async (teacherId: string) => {
  return prisma.teacherSubjectAssignment.findMany({
    where: {
      teacherId,
    },

    select: {
      id: true,

      subject: {
        select: {
          id: true,
          name: true,

          class: {
            select: {
              id: true,
              name: true,
              numericValue: true,
            },
          },
        },
      },
    },
  });
};

const assignSubjects = async (teacherId: string, subjectIds: string[]) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      id: teacherId,
      isDeleted: false,
    },

    select: {
      id: true,
    },
  });

  if (!teacher) {
    throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");
  }

  const uniqueSubjectIds = [...new Set(subjectIds)];

  const subjects = await prisma.subject.findMany({
    where: {
      id: {
        in: uniqueSubjectIds,
      },
    },

    select: {
      id: true,
    },
  });

  if (subjects.length !== uniqueSubjectIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "One or more subjects are invalid.",
    );
  }

  await prisma.teacherSubjectAssignment.createMany({
    data: uniqueSubjectIds.map((subjectId) => ({
      teacherId,
      subjectId,
    })),

    skipDuplicates: true,
  });

  return prisma.teacherSubjectAssignment.findMany({
    where: {
      teacherId,
    },

    select: {
      id: true,

      subject: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const TeacherService = {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherSubjects,
  assignSubjects,
};
