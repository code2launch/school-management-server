import httpStatus from "http-status";

import { FeeType, PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "../../shared/prisma";

import ApiError from "../../errors/ApiError";

import { generateReceiptNumber } from "../../constants";

// ======================================================
// CREATE FEE STRUCTURE
// ======================================================

const createFeeStructure = async (payload: {
  feeType: FeeType;
  amount: number;
  label: string;
  academicYearId: string;
  classId?: string;
}) => {
  // prevent duplicates

  const existing = await prisma.feeStructure.findFirst({
    where: {
      academicYearId: payload.academicYearId,

      feeType: payload.feeType,

      classId: payload.classId ?? null,

      isActive: true,
    },

    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, "Fee structure already exists");
  }

  return prisma.feeStructure.create({
    data: {
      ...payload,

      amount: new Prisma.Decimal(payload.amount),
    },
  });
};

// ======================================================
// GET FEE STRUCTURES
// ======================================================

const getFeeStructures = async (academicYearId: string, classId?: string) => {
  return prisma.feeStructure.findMany({
    where: {
      academicYearId,

      isActive: true,

      ...(classId
        ? {
            OR: [{ classId }, { classId: null }],
          }
        : {}),
    },

    select: {
      id: true,
      feeType: true,
      amount: true,
      label: true,
      classId: true,
    },

    orderBy: [
      {
        feeType: "asc",
      },
    ],
  });
};

// ======================================================
// UPDATE FEE STRUCTURE
// ======================================================

const updateFeeStructure = async (
  id: string,
  payload: {
    amount?: number;
    label?: string;
    isActive?: boolean;
  },
) => {
  const fee = await prisma.feeStructure.findUnique({
    where: { id },

    select: {
      id: true,
    },
  });

  if (!fee) {
    throw new ApiError(httpStatus.NOT_FOUND, "Fee structure not found");
  }

  return prisma.feeStructure.update({
    where: { id },

    data: {
      ...(payload.amount && {
        amount: new Prisma.Decimal(payload.amount),
      }),

      ...(payload.label && {
        label: payload.label,
      }),

      ...(payload.isActive !== undefined && {
        isActive: payload.isActive,
      }),
    },
  });
};

// ======================================================
// RECORD PAYMENT
// ======================================================

const recordPayment = async (
  payload: {
    studentId: string;
    academicYearId: string;
    feeType: FeeType;
    amount: number;
    paidAmount: number;
    month?: number;
    year?: number;
    paymentMethod?: string;
    paymentDate?: string;
    note?: string;
  },
  collectedBy?: string,
) => {
  // Validate inputs early
  if (payload.paidAmount > payload.amount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Paid amount cannot exceed total amount",
    );
  }

  // Generate receipt number outside transaction to reduce transaction time
  const year = new Date().getFullYear();
  let receiptNumber: string;

  // Get receipt number with a separate lighter query
  try {
    const count = await prisma.feePayment.count();
    receiptNumber = generateReceiptNumber(year, count + 1);
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate receipt number",
    );
  }

  // Use transaction with increased timeout and optimized isolation level
  return prisma.$transaction(
    async (tx) => {
      // Validate student existence with minimal fields
      const student = await tx.student.findFirst({
        where: {
          id: payload.studentId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          studentId: true,
        },
      });

      if (!student) {
        throw new ApiError(httpStatus.NOT_FOUND, "Student not found");
      }

      // Check for duplicate monthly payment (optimized query)
      if (
        payload.feeType === "MONTHLY_TUITION" &&
        payload.month &&
        payload.year
      ) {
        const existing = await tx.feePayment.findFirst({
          where: {
            studentId: payload.studentId,
            academicYearId: payload.academicYearId,
            feeType: "MONTHLY_TUITION",
            month: payload.month,
            year: payload.year,
            paymentStatus: "PAID",
          },
          select: { id: true },
        });

        if (existing) {
          throw new ApiError(
            httpStatus.CONFLICT,
            "Monthly tuition already paid",
          );
        }
      }

      // Calculate status and due amount
      let paymentStatus: PaymentStatus = "UNPAID";
      if (payload.paidAmount === payload.amount) {
        paymentStatus = "PAID";
      } else if (payload.paidAmount > 0) {
        paymentStatus = "PARTIAL";
      }

      const dueAmount = payload.amount - payload.paidAmount;

      // Create payment record
      const payment = await tx.feePayment.create({
        data: {
          receiptNumber,
          studentId: payload.studentId,
          academicYearId: payload.academicYearId,
          feeType: payload.feeType,
          month: payload.month,
          year: payload.year,
          amount: new Prisma.Decimal(payload.amount),
          paidAmount: new Prisma.Decimal(payload.paidAmount),
          dueAmount: new Prisma.Decimal(dueAmount),
          paymentStatus,
          paymentMethod: payload.paymentMethod,
          paymentDate: payload.paymentDate
            ? new Date(payload.paymentDate)
            : new Date(),
          collectedBy,
          note: payload.note,
        },
        include: {
          student: {
            select: {
              name: true,
              studentId: true,
            },
          },
        },
      });

      return payment;
    },
    {
      // Increase transaction timeout (default is 5 seconds)
      timeout: 15000, // 15 seconds
      // Set isolation level to reduce locks
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      // Maximum retries for transaction conflicts
      maxWait: 10000, // Wait max 10 seconds for transaction to start
    },
  );
};

// ======================================================
// STUDENT PAYMENTS
// ======================================================

const getStudentPayments = async (
  studentId: string,
  academicYearId: string,
) => {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },

    select: {
      id: true,
      name: true,
      studentId: true,
    },
  });

  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, "Student not found");
  }

  const payments = await prisma.feePayment.findMany({
    where: {
      studentId,
      academicYearId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  const summary = payments.reduce(
    (acc, p) => {
      acc.totalAmount += Number(p.amount);

      acc.totalPaid += Number(p.paidAmount);

      acc.totalDue += Number(p.dueAmount);

      return acc;
    },

    {
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0,
    },
  );

  return {
    student,
    summary,
    payments,
  };
};

// ======================================================
// PENDING DUES
// ======================================================

const getPendingDues = async (
  academicYearId: string,
  classId?: string,
  sectionId?: string,
) => {
  return prisma.enrollment.findMany({
    where: {
      academicYearId,

      isActive: true,

      ...(classId && {
        classId,
      }),

      ...(sectionId && {
        sectionId,
      }),

      student: {
        feePayments: {
          some: {
            paymentStatus: {
              in: ["UNPAID", "PARTIAL"],
            },
          },
        },
      },
    },

    select: {
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,

          feePayments: {
            where: {
              academicYearId,

              paymentStatus: {
                in: ["UNPAID", "PARTIAL"],
              },
            },

            select: {
              id: true,
              feeType: true,
              dueAmount: true,
              paymentStatus: true,
              month: true,
              year: true,
            },
          },
        },
      },

      section: {
        select: {
          name: true,

          class: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
};

// ======================================================
// RECEIPT
// ======================================================

// const getReceipt = async (receiptNumber: string) => {
//   const payment = await prisma.feePayment.findUnique({
//     where: {
//       receiptNumber,
//     },

//     include: {
//       student: {
//         select: {
//           name: true,
//           studentId: true,

//           enrollments: {
//             where: {
//               isActive: true,
//             },

//             take: 1,

//             select: {
//               section: {
//                 select: {
//                   name: true,

//                   class: {
//                     select: {
//                       name: true,
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },

//       academicYear: true,
//     },
//   });

//   if (!payment) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Receipt not found");
//   }

//   const school = await prisma.schoolProfile.findFirst({
//     select: {
//       name: true,
//       logo: true,
//       address: true,
//       phone: true,
//     },
//   });

//   return {
//     school,
//     payment,
//   };
// };

const getReceipt = async (receiptNumber: string) => {
  const payment = await prisma.feePayment.findUnique({
    where: {
      receiptNumber,
    },
    include: {
      student: {
        select: {
          name: true,
          studentId: true,
          enrollments: {
            where: {
              isActive: true,
            },
            take: 1,
            select: {
              section: {
                select: {
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
      },
      academicYear: true,
    },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Receipt not found");
  }

  // Fixed: Use 'logoUrl' instead of 'logo'
  const school = await prisma.schoolProfile.findFirst({
    select: {
      name: true,
      logoUrl: true, // Changed from 'logo' to 'logoUrl'
      address: true,
      phone: true,
      email: true, // You might want to include email as well
    },
  });

  return {
    school,
    payment,
  };
};

// ======================================================
// COLLECTION REPORT
// ======================================================

const getFeeCollectionReport = async (
  academicYearId: string,
  month?: number,
  year?: number,
) => {
  const where: Prisma.FeePaymentWhereInput = {
    academicYearId,
  };

  if (month && year) {
    where.month = month;
    where.year = year;
  }

  const grouped = await prisma.feePayment.groupBy({
    by: ["feeType", "paymentStatus"],

    where,

    _sum: {
      amount: true,
      paidAmount: true,
      dueAmount: true,
    },

    _count: true,
  });

  const totals = grouped.reduce(
    (acc, item) => {
      acc.totalCollected += Number(item._sum.paidAmount ?? 0);

      acc.totalDue += Number(item._sum.dueAmount ?? 0);

      return acc;
    },

    {
      totalCollected: 0,
      totalDue: 0,
    },
  );

  return {
    ...totals,
    breakdown: grouped,
  };
};

export const FeesService = {
  createFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  recordPayment,
  getStudentPayments,
  getPendingDues,
  getReceipt,
  getFeeCollectionReport,
};
