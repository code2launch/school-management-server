import httpStatus from "http-status";
import { FeeType, PaymentStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { generateReceiptNumber } from "../../constants";

// ── Fee Structure ─────────────────────────────────────────────

const createFeeStructure = async (payload: {
  feeType: FeeType;
  amount: number;
  label: string;
  academicYearId: string;
  classId?: string;
}) => {
  return prisma.feeStructure.create({ data: payload });
};

const getFeeStructures = async (academicYearId: string, classId?: string) => {
  return prisma.feeStructure.findMany({
    where: {
      academicYearId,
      isActive: true,
      ...(classId ? { OR: [{ classId }, { classId: null }] } : {}),
    },
    orderBy: { feeType: "asc" },
  });
};

const updateFeeStructure = async (id: string, payload: { amount?: number; label?: string; isActive?: boolean }) => {
  const fee = await prisma.feeStructure.findUnique({ where: { id } });
  if (!fee) throw new ApiError(httpStatus.NOT_FOUND, "Fee structure not found.");
  return prisma.feeStructure.update({ where: { id }, data: payload });
};

// ── Payments ──────────────────────────────────────────────────

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
  collectedBy?: string
) => {
  const student = await prisma.student.findFirst({ where: { id: payload.studentId, isDeleted: false } });
  if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");

  // Check for duplicate monthly fee
  if (payload.feeType === "MONTHLY_TUITION" && payload.month && payload.year) {
    const duplicate = await prisma.feePayment.findFirst({
      where: {
        studentId: payload.studentId,
        academicYearId: payload.academicYearId,
        feeType: payload.feeType,
        month: payload.month,
        year: payload.year,
        paymentStatus: { in: ["PAID", "PARTIAL"] },
      },
    });
    if (duplicate && duplicate.paymentStatus === "PAID")
      throw new ApiError(httpStatus.CONFLICT, "Monthly fee already fully paid for this month.");
  }

  const dueAmount = payload.amount - payload.paidAmount;
  let paymentStatus: PaymentStatus = "UNPAID";
  if (payload.paidAmount >= payload.amount) paymentStatus = "PAID";
  else if (payload.paidAmount > 0) paymentStatus = "PARTIAL";

  // Generate receipt number
  const count = await prisma.feePayment.count();
  const receiptNumber = generateReceiptNumber(
    payload.year ?? new Date().getFullYear(),
    count + 1
  );

  return prisma.feePayment.create({
    data: {
      receiptNumber,
      studentId: payload.studentId,
      academicYearId: payload.academicYearId,
      feeType: payload.feeType,
      month: payload.month,
      year: payload.year,
      amount: payload.amount,
      paidAmount: payload.paidAmount,
      dueAmount,
      paymentStatus,
      paymentMethod: payload.paymentMethod,
      paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
      collectedBy,
      note: payload.note,
    },
    include: {
      student: { select: { name: true, studentId: true } },
    },
  });
};

const getStudentPayments = async (studentId: string, academicYearId: string) => {
  const [payments, student] = await Promise.all([
    prisma.feePayment.findMany({
      where: { studentId, academicYearId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true, studentId: true },
    }),
  ]);

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.paidAmount, 0);
  const totalDue = payments.reduce((s, p) => s + p.dueAmount, 0);

  return { student, totalAmount, totalPaid, totalDue, payments };
};

const getPendingDues = async (
  academicYearId: string,
  classId?: string,
  sectionId?: string
) => {
  const enrollmentFilter: any = { academicYearId, isActive: true };
  if (classId) enrollmentFilter.classId = classId;
  if (sectionId) enrollmentFilter.sectionId = sectionId;

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentFilter,
    include: {
      student: {
        select: { id: true, name: true, studentId: true },
        include: {
          feePayments: {
            where: {
              academicYearId,
              paymentStatus: { in: ["UNPAID", "PARTIAL"] },
            },
            select: { id: true, feeType: true, dueAmount: true, month: true, year: true, paymentStatus: true },
          },
        } as any,
      },
      section: { include: { class: true } },
    },
  });

  return enrollments
    .filter((e) => (e.student as any).feePayments?.length > 0)
    .map((e) => ({
      student: { id: (e.student as any).id, name: (e.student as any).name, studentId: (e.student as any).studentId },
      class: (e.section as any).class?.name,
      section: e.section?.name,
      dues: (e.student as any).feePayments,
      totalDue: (e.student as any).feePayments.reduce((s: number, p: any) => s + p.dueAmount, 0),
    }));
};

const getReceipt = async (receiptNumber: string) => {
  const payment = await prisma.feePayment.findUnique({
    where: { receiptNumber },
    include: {
      student: {
        select: { name: true, studentId: true },
        include: {
          enrollments: {
            where: { isActive: true },
            include: { section: { include: { class: true } } },
            take: 1,
          },
        } as any,
      },
      academicYear: true,
    },
  });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Receipt not found.");

  const school = await prisma.schoolProfile.findFirst();
  return { school, payment };
};

const getFeeCollectionReport = async (academicYearId: string, month?: number, year?: number) => {
  const where: any = { academicYearId };
  if (month && year) {
    where.month = month;
    where.year = year;
  }

  const payments = await prisma.feePayment.groupBy({
    by: ["feeType", "paymentStatus"],
    where,
    _sum: { paidAmount: true, dueAmount: true, amount: true },
    _count: true,
  });

  const totalCollected = payments.reduce((s, p) => s + (p._sum.paidAmount ?? 0), 0);
  const totalDue = payments.reduce((s, p) => s + (p._sum.dueAmount ?? 0), 0);

  return { totalCollected, totalDue, breakdown: payments };
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
