import { prisma } from "../../shared/prisma";

// ── Admin Dashboard ───────────────────────────────────────────

const getAdminDashboard = async () => {
  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const academicYearId = currentYear?.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Run all heavy queries in parallel
  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    todayAttendance,
    feeCollection,
    pendingDues,
    recentNotices,
    recentAdmissions,
  ] = await Promise.all([
    // Total active students (current year)
    academicYearId
      ? prisma.enrollment.count({ where: { academicYearId, isActive: true } })
      : prisma.student.count({ where: { isActive: true, isDeleted: false } }),

    // Total active teachers
    prisma.teacher.count({ where: { isActive: true, isDeleted: false } }),

    // Total active classes
    prisma.class.count({ where: { isActive: true, isDeleted: false } }),

    // Today's attendance summary (all sections)
    prisma.studentAttendance.groupBy({
      by: ["status"],
      where: { date: today, ...(academicYearId ? { academicYearId } : {}) },
      _count: true,
    }),

    // Fee collection this month
    prisma.feePayment.aggregate({
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        paymentDate: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
          lte: today,
        },
      },
      _sum: { paidAmount: true },
    }),

    // Total pending dues amount
    prisma.feePayment.aggregate({
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        paymentStatus: { in: ["UNPAID", "PARTIAL"] },
      },
      _sum: { dueAmount: true },
      _count: true,
    }),

    // Recent 5 notices
    prisma.notice.findMany({
      where: { isDeleted: false, isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, audience: true, createdAt: true },
    }),

    // Recent 5 admissions
    prisma.student.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, studentId: true, createdAt: true },
    }),
  ]);

  // Build today's attendance counts
  const attCounts: Record<string, number> = {};
  for (const a of todayAttendance) attCounts[a.status] = a._count;

  // Class-wise enrollment breakdown
  const classBreakdown = await prisma.enrollment.groupBy({
    by: ["classId"],
    where: { ...(academicYearId ? { academicYearId } : {}), isActive: true },
    _count: true,
  });

  const classIds = classBreakdown.map((c) => c.classId);
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true, name: true, numericValue: true },
    orderBy: { numericValue: "asc" },
  });

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const enrollmentBreakdown = classBreakdown.map((c) => ({
    class: classMap.get(c.classId),
    count: c._count,
  }));

  return {
    currentYear,
    stats: {
      totalStudents,
      totalTeachers,
      totalClasses,
      todayAttendance: {
        present: attCounts["PRESENT"] ?? 0,
        absent: attCounts["ABSENT"] ?? 0,
        late: attCounts["LATE"] ?? 0,
        leave: attCounts["LEAVE"] ?? 0,
        total: Object.values(attCounts).reduce((s, v) => s + v, 0),
      },
      feeCollectedThisMonth: feeCollection._sum.paidAmount ?? 0,
      totalPendingDue: pendingDues._sum.dueAmount ?? 0,
      studentsWithDues: pendingDues._count,
    },
    enrollmentBreakdown,
    recentNotices,
    recentAdmissions,
  };
};

// ── Teacher Dashboard ─────────────────────────────────────────

const getTeacherDashboard = async (teacherId: string) => {
  const today = new Date();
  const dayName = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][
    today.getDay()
  ] as any;
  today.setHours(0, 0, 0, 0);

  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

  const [teacher, todaysClasses, subjectAssignments, teacherAttToday] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, employeeId: true, phone: true },
    }),

    // Today's routine slots for this teacher
    prisma.routineSlot.findMany({
      where: { teacherId, dayOfWeek: dayName },
      orderBy: { periodNumber: "asc" },
      include: {
        subject: { select: { name: true } },
        section: { include: { class: { select: { name: true } } } },
      },
    }),

    // All assigned subjects
    prisma.teacherSubjectAssignment.findMany({
      where: { teacherId },
      include: {
        subject: { include: { class: { select: { name: true } } } },
      },
    }),

    // Own attendance today
    prisma.teacherAttendance.findFirst({
      where: { teacherId, date: today },
    }),
  ]);

  // Count sections this teacher is responsible for
  const sectionIds = [...new Set(todaysClasses.map((c) => c.sectionId))];

  // Quick attendance status for today's sections
  const sectionAttendanceSummary = await Promise.all(
    sectionIds.map(async (sectionId) => {
      const [total, marked] = await Promise.all([
        prisma.enrollment.count({
          where: { sectionId, isActive: true, ...(currentYear ? { academicYearId: currentYear.id } : {}) },
        }),
        prisma.studentAttendance.count({
          where: { sectionId, date: today },
        }),
      ]);
      const section = todaysClasses.find((c) => c.sectionId === sectionId)?.section;
      return {
        sectionId,
        sectionName: section?.name,
        className: section?.class?.name,
        totalStudents: total,
        markedToday: marked,
        isComplete: marked >= total,
      };
    })
  );

  return {
    teacher,
    todaysClasses,
    subjectAssignments,
    attendanceStatus: teacherAttToday,
    sectionAttendanceSummary,
    currentYear,
  };
};

// ── Student Dashboard ─────────────────────────────────────────

const getStudentDashboard = async (studentId: string) => {
  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { isActive: true },
        include: {
          section: { include: { class: true } },
          academicYear: true,
        },
        take: 1,
      },
    },
  });

  if (!student) return null;

  const enrollment = student.enrollments[0];
  const sectionId = enrollment?.sectionId;
  const academicYearId = enrollment?.academicYearId ?? currentYear?.id;

  const [attendanceSummary, feeStatus, recentResults, todayRoutine, notices] = await Promise.all([
    // This month's attendance
    sectionId && academicYearId
      ? prisma.studentAttendance.groupBy({
          by: ["status"],
          where: {
            studentId,
            academicYearId,
            date: {
              gte: new Date(today.getFullYear(), today.getMonth(), 1),
              lte: today,
            },
          },
          _count: true,
        })
      : Promise.resolve([]),

    // Fee status
    academicYearId
      ? prisma.feePayment.findMany({
          where: {
            studentId,
            academicYearId,
            paymentStatus: { in: ["UNPAID", "PARTIAL"] },
          },
          select: { feeType: true, dueAmount: true, month: true, year: true, paymentStatus: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),

    // Recent exam results
    prisma.examResult.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        exam: { select: { name: true, examType: true } },
        subject: { select: { name: true } } as any,
      },
    }),

    // Today's class routine
    sectionId
      ? prisma.routineSlot.findMany({
          where: {
            sectionId,
            dayOfWeek: ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][today.getDay()] as any,
          },
          orderBy: { periodNumber: "asc" },
          include: {
            subject: { select: { name: true } },
            teacher: { select: { name: true } },
          },
        })
      : Promise.resolve([]),

    // Recent notices
    prisma.notice.findMany({
      where: { isDeleted: false, isPublished: true, audience: { in: ["ALL", "STUDENTS"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  const attCounts: Record<string, number> = {};
  for (const a of attendanceSummary as any[]) attCounts[a.status] = a._count;
  const totalAttDays = Object.values(attCounts).reduce((s: number, v: any) => s + v, 0);
  const presentDays = attCounts["PRESENT"] ?? 0;

  const totalDue = (feeStatus as any[]).reduce((s: number, f: any) => s + f.dueAmount, 0);

  return {
    student: {
      id: student.id,
      name: student.name,
      studentId: student.studentId,
      class: enrollment?.section?.class?.name,
      section: enrollment?.section?.name,
      academicYear: enrollment?.academicYear?.year,
    },
    attendanceSummary: {
      present: presentDays,
      absent: attCounts["ABSENT"] ?? 0,
      late: attCounts["LATE"] ?? 0,
      leave: attCounts["LEAVE"] ?? 0,
      total: totalAttDays,
      percentage: totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 0,
    },
    feeStatus: {
      hasDues: (feeStatus as any[]).length > 0,
      totalDue,
      dues: feeStatus,
    },
    recentResults,
    todayRoutine,
    notices,
  };
};

// ── Parent Dashboard ──────────────────────────────────────────

const getParentDashboard = async (parentId: string) => {
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    include: {
      children: {
        include: {
          student: {
            select: { id: true, name: true, studentId: true },
          },
        },
      },
    },
  });

  if (!parent) return null;

  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const childrenData = await Promise.all(
    parent.children.map(async ({ student }) => {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, isActive: true },
        include: { section: { include: { class: true } }, academicYear: true },
      });

      const academicYearId = enrollment?.academicYearId ?? currentYear?.id;

      const [todayAtt, monthlyAtt, pendingFees] = await Promise.all([
        prisma.studentAttendance.findFirst({
          where: { studentId: student.id, date: today },
          select: { status: true },
        }),
        academicYearId
          ? prisma.studentAttendance.groupBy({
              by: ["status"],
              where: {
                studentId: student.id,
                academicYearId,
                date: {
                  gte: new Date(today.getFullYear(), today.getMonth(), 1),
                  lte: today,
                },
              },
              _count: true,
            })
          : Promise.resolve([]),
        academicYearId
          ? prisma.feePayment.aggregate({
              where: {
                studentId: student.id,
                academicYearId,
                paymentStatus: { in: ["UNPAID", "PARTIAL"] },
              },
              _sum: { dueAmount: true },
              _count: true,
            })
          : Promise.resolve({ _sum: { dueAmount: null }, _count: 0 }),
      ]);

      const attCounts: Record<string, number> = {};
      for (const a of monthlyAtt as any[]) attCounts[a.status] = a._count;
      const totalDays = Object.values(attCounts).reduce((s: number, v: any) => s + v, 0);

      return {
        student,
        class: enrollment?.section?.class?.name,
        section: enrollment?.section?.name,
        todayAttendance: (todayAtt as any)?.status ?? "NOT_MARKED",
        monthlyAttendance: {
          present: attCounts["PRESENT"] ?? 0,
          absent: attCounts["ABSENT"] ?? 0,
          total: totalDays,
          percentage: totalDays > 0 ? Math.round(((attCounts["PRESENT"] ?? 0) / totalDays) * 100) : 0,
        },
        fees: {
          totalDue: (pendingFees as any)._sum?.dueAmount ?? 0,
          count: (pendingFees as any)._count,
        },
      };
    })
  );

  const notices = await prisma.notice.findMany({
    where: { isDeleted: false, isPublished: true, audience: { in: ["ALL", "PARENTS"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, createdAt: true },
  });

  return {
    parent: { id: parent.id, name: parent.name, phone: parent.phone },
    children: childrenData,
    notices,
  };
};

export const DashboardService = {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard,
  getParentDashboard,
};
