import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

// ── Attendance Report (monthly, class-wise) ───────────────────

const getAttendanceReport = async (params: {
  academicYearId: string;
  sectionId?: string;
  classId?: string;
  month: number;
  year: number;
}) => {
  const { academicYearId, sectionId, classId, month, year } = params;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Resolve sections to include
  let sectionIds: string[] = [];
  if (sectionId) {
    sectionIds = [sectionId];
  } else if (classId) {
    const sections = await prisma.section.findMany({
      where: { classId, isDeleted: false },
      select: { id: true },
    });
    sectionIds = sections.map((s) => s.id);
  }

  const enrollmentFilter: any = { academicYearId, isActive: true };
  if (sectionIds.length > 0) enrollmentFilter.sectionId = { in: sectionIds };

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentFilter,
    include: {
      student: { select: { id: true, name: true, studentId: true } },
      section: { include: { class: { select: { name: true } } } },
    },
    orderBy: [
      { section: { class: { numericValue: "asc" } } },
      { rollNumber: "asc" },
    ],
  });

  const studentIds = enrollments.map((e) => e.studentId);

  const attendances = await prisma.studentAttendance.findMany({
    where: {
      studentId: { in: studentIds },
      academicYearId,
      date: { gte: startDate, lte: endDate },
    },
  });

  // Group by student
  const attMap = new Map<
    string,
    { P: number; A: number; L: number; La: number }
  >();
  for (const a of attendances) {
    if (!attMap.has(a.studentId))
      attMap.set(a.studentId, { P: 0, A: 0, L: 0, La: 0 });
    const counts = attMap.get(a.studentId)!;
    if (a.status === "PRESENT") counts.P++;
    else if (a.status === "ABSENT") counts.A++;
    else if (a.status === "LEAVE") counts.L++;
    else if (a.status === "LATE") counts.La++;
  }

  const workingDays =
    attendances.length > 0
      ? new Set(attendances.map((a) => a.date.toISOString().split("T")[0])).size
      : 0;

  const rows = enrollments.map((e) => {
    const att = attMap.get(e.studentId) ?? { P: 0, A: 0, L: 0, La: 0 };
    const total = att.P + att.A + att.L + att.La;
    return {
      studentId: e.student.studentId,
      name: e.student.name,
      class: e.section.class?.name,
      section: e.section.name,
      rollNumber: e.rollNumber,
      present: att.P,
      absent: att.A,
      late: att.La,
      leave: att.L,
      total,
      percentage: workingDays > 0 ? Math.round((att.P / workingDays) * 100) : 0,
    };
  });

  return { month, year, workingDays, totalStudents: rows.length, rows };
};

// ── Fee Collection Report ─────────────────────────────────────

const getFeeCollectionReport = async (params: {
  academicYearId: string;
  month?: number;
  year?: number;
  classId?: string;
}) => {
  const { academicYearId, month, year, classId } = params;

  const where: any = { academicYearId };
  if (month && year) {
    where.paymentDate = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0),
    };
  }

  let payments = await prisma.feePayment.findMany({
    where,
    include: {
      student: {
        select: { id: true, name: true, studentId: true },
        include: {
          enrollments: {
            where: { academicYearId, isActive: true },
            include: { section: { include: { class: true } } },
            take: 1,
          },
        } as any,
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  // Filter by class if requested
  if (classId) {
    payments = payments.filter(
      (p) =>
        (p.student as any).enrollments?.[0]?.section?.class?.id === classId,
    );
  }

  const totalCollected = payments.reduce(
    (s, p) => s + p.paidAmount.toNumber(),
    0,
  );

  const totalDue = payments.reduce((s, p) => s + p.dueAmount.toNumber(), 0);

  const totalExpected = payments.reduce((s, p) => s + p.amount.toNumber(), 0);

  // Group by fee type
  const byType: Record<
    string,
    { count: number; collected: number; due: number }
  > = {};
  for (const p of payments) {
    if (!byType[p.feeType])
      byType[p.feeType] = { count: 0, collected: 0, due: 0 };
    byType[p.feeType].count++;
    byType[p.feeType].collected += p.paidAmount.toNumber();
    byType[p.feeType].due += p.dueAmount.toNumber();
  }

  return {
    month,
    year,
    totalExpected,
    totalCollected,
    totalDue,
    collectionRate:
      totalExpected > 0
        ? Math.round((totalCollected / totalExpected) * 100)
        : 0,
    byType,
    payments: payments.map((p) => ({
      receiptNumber: p.receiptNumber,
      studentName: (p.student as any).name,
      studentId: (p.student as any).studentId,
      class: (p.student as any).enrollments?.[0]?.section?.class?.name,
      feeType: p.feeType,
      amount: p.amount,
      paidAmount: p.paidAmount,
      dueAmount: p.dueAmount,
      status: p.paymentStatus,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
    })),
  };
};

// ── Student List by Class ─────────────────────────────────────

const getStudentListByClass = async (params: {
  academicYearId: string;
  classId?: string;
  sectionId?: string;
}) => {
  const { academicYearId, classId, sectionId } = params;

  const where: any = { academicYearId, isActive: true };
  if (classId) where.classId = classId;
  if (sectionId) where.sectionId = sectionId;

  // const enrollments = await prisma.enrollment.findMany({
  //   where,
  //   include: {
  //     student: {
  //       select: {
  //         id: true,
  //         name: true,
  //         studentId: true,
  //         dob: true,
  //         gender: true,
  //         phone: true,
  //       },
  //       include: {
  //         parents: {
  //           where: { isPrimary: true },
  //           include: { parent: { select: { name: true, phone: true } } },
  //         },
  //       } as any,
  //     },
  //     section: {
  //       include: {
  //         class: { select: { id: true, name: true, numericValue: true } },
  //       },
  //     },
  //   },
  //   orderBy: [
  //     { section: { class: { numericValue: "asc" } } },
  //     { section: { name: "asc" } },
  //     { rollNumber: "asc" },
  //   ],
  // });

  const enrollments = await prisma.enrollment.findMany({
    where,

    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
          dob: true,
          gender: true,

          parents: {
            where: {
              isPrimary: true,
            },

            include: {
              parent: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      },

      section: {
        include: {
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

    orderBy: [
      {
        section: {
          class: {
            numericValue: "asc",
          },
        },
      },

      {
        section: {
          name: "asc",
        },
      },

      {
        rollNumber: "asc",
      },
    ],
  });

  const grouped: Record<string, any[]> = {};
  for (const e of enrollments) {
    const key = `${e.section.class?.name} - ${e.section.name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      rollNumber: e.rollNumber,
      studentId: (e.student as any).studentId,
      name: (e.student as any).name,
      gender: (e.student as any).gender,
      dob: (e.student as any).dob,
      parentName: (e.student as any).parents?.[0]?.parent?.name,
      parentPhone: (e.student as any).parents?.[0]?.parent?.phone,
    });
  }

  return {
    totalStudents: enrollments.length,
    sections: Object.entries(grouped).map(([label, students]) => ({
      label,
      count: students.length,
      students,
    })),
  };
};

// ── Result Sheet Report ───────────────────────────────────────

const getResultSheetReport = async (params: {
  examId: string;
  classId?: string;
  sectionId?: string;
}) => {
  const { examId, sectionId, classId } = params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { subjects: { include: { subject: true } }, academicYear: true },
  });
  if (!exam) throw new ApiError(httpStatus.NOT_FOUND, "Exam not found.");

  const enrollmentFilter: any = {
    academicYearId: exam.academicYearId,
    isActive: true,
  };
  if (sectionId) enrollmentFilter.sectionId = sectionId;
  else if (classId) enrollmentFilter.classId = classId;

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentFilter,
    include: {
      student: { select: { id: true, name: true, studentId: true } },
      section: { include: { class: true } },
    },
    orderBy: [
      { section: { class: { numericValue: "asc" } } },
      { rollNumber: "asc" },
    ],
  });

  const studentIds = enrollments.map((e) => e.studentId);
  const results = await prisma.examResult.findMany({
    where: { examId, studentId: { in: studentIds } },
  });

  const resultMap = new Map<string, Map<string, (typeof results)[0]>>();
  for (const r of results) {
    if (!resultMap.has(r.studentId)) resultMap.set(r.studentId, new Map());
    resultMap.get(r.studentId)!.set(r.subjectId, r);
  }

  const rows = enrollments.map((e) => {
    const sr = resultMap.get(e.studentId) ?? new Map();
    const subjects = exam.subjects.map((es) => {
      const r = sr.get(es.subjectId);
      return {
        subjectName: es.subject.name,
        totalMarks: es.totalMarks,
        marksObtained: r?.marksObtained ?? "-",
        grade: r?.grade ?? "-",
        isPassed: r?.isPassed ?? null,
      };
    });
    const attempted = subjects.filter(
      (s) => typeof s.marksObtained === "number",
    );
    const totalObtained = attempted.reduce(
      (s, r) => s + (typeof r.marksObtained === "number" ? r.marksObtained : 0),
      0,
    );
    const totalMax = attempted.reduce((s, r) => s + r.totalMarks, 0);

    return {
      rollNumber: e.rollNumber,
      studentId: e.student.studentId,
      name: e.student.name,
      class: e.section.class?.name,
      section: e.section.name,
      subjects,
      totalObtained,
      totalMax,
      percentage:
        totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0,
      isPassed:
        attempted.length > 0 && attempted.every((s) => s.isPassed === true),
    };
  });

  // Pass/fail summary
  const passed = rows.filter((r) => r.isPassed).length;

  return {
    exam: {
      name: exam.name,
      type: exam.examType,
      year: (exam as any).academicYear?.year,
    },
    subjects: exam.subjects.map((s) => s.subject.name),
    totalStudents: rows.length,
    passed,
    failed: rows.length - passed,
    rows,
  };
};

export const ReportService = {
  getAttendanceReport,
  getFeeCollectionReport,
  getStudentListByClass,
  getResultSheetReport,
};
