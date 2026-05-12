import httpStatus from "http-status";
import { AttendanceStatus, Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

const normalizeDate = (date: string) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getMonthRange = (month: number, year: number) => {
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 0)),
  };
};

// =======================================================
// MARK STUDENT ATTENDANCE
// =======================================================

const markStudentAttendance = async (payload: {
  sectionId: string;
  academicYearId: string;
  date: string;
  takenByTeacherId?: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    note?: string;
  }>;
}) => {
  const attendanceDate = normalizeDate(payload.date);

  // Validate section exists
  const section = await prisma.section.findFirst({
    where: {
      id: payload.sectionId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!section) {
    throw new ApiError(httpStatus.NOT_FOUND, "Section not found");
  }

  // Get valid students from enrollment
  const validEnrollments = await prisma.enrollment.findMany({
    where: {
      sectionId: payload.sectionId,
      academicYearId: payload.academicYearId,
      isActive: true,
      studentId: {
        in: payload.records.map((r) => r.studentId),
      },
    },
    select: {
      studentId: true,
    },
  });

  const validStudentIds = new Set(validEnrollments.map((e) => e.studentId));

  // Security validation
  const invalidStudents = payload.records.filter(
    (r) => !validStudentIds.has(r.studentId),
  );

  if (invalidStudents.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Some students are not enrolled in this section",
    );
  }

  // Bulk upsert transaction
  const operations: Prisma.PrismaPromise<any>[] = [];

  for (const record of payload.records) {
    operations.push(
      prisma.studentAttendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: attendanceDate,
          },
        },
        create: {
          studentId: record.studentId,
          sectionId: payload.sectionId,
          academicYearId: payload.academicYearId,
          date: attendanceDate,
          status: record.status,
          note: record.note,
          takenByTeacherId: payload.takenByTeacherId,
        },
        update: {
          status: record.status,
          note: record.note,
          takenByTeacherId: payload.takenByTeacherId,
        },
      }),
    );
  }

  await prisma.$transaction(operations);

  return {
    success: true,
    total: payload.records.length,
  };
};

// =======================================================
// GET ATTENDANCE BY DATE
// =======================================================

const getAttendanceByDate = async (
  sectionId: string,
  date: string,
  academicYearId: string,
) => {
  const attendanceDate = normalizeDate(date);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      sectionId,
      academicYearId,
      isActive: true,
    },
    select: {
      rollNumber: true,
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
        },
      },
    },
    orderBy: {
      rollNumber: "asc",
    },
  });

  const attendances = await prisma.studentAttendance.findMany({
    where: {
      sectionId,
      academicYearId,
      date: attendanceDate,
    },
    select: {
      studentId: true,
      status: true,
      note: true,
    },
  });

  const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

  return enrollments.map((enrollment) => ({
    student: enrollment.student,
    rollNumber: enrollment.rollNumber,
    attendance: attendanceMap.get(enrollment.student.id) || null,
  }));
};

// =======================================================
// MONTHLY ATTENDANCE
// =======================================================

const getMonthlyAttendance = async (
  sectionId: string,
  academicYearId: string,
  month: number,
  year: number,
) => {
  const { startDate, endDate } = getMonthRange(month, year);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      sectionId,
      academicYearId,
      isActive: true,
    },
    select: {
      rollNumber: true,
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
        },
      },
    },
    orderBy: {
      rollNumber: "asc",
    },
  });

  const attendances = await prisma.studentAttendance.findMany({
    where: {
      sectionId,
      academicYearId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      studentId: true,
      status: true,
      date: true,
    },
  });

  const grouped = new Map<
    string,
    Array<{
      studentId: string;
      status: AttendanceStatus;
      date: Date;
    }>
  >();

  for (const attendance of attendances) {
    if (!grouped.has(attendance.studentId)) {
      grouped.set(attendance.studentId, []);
    }

    grouped.get(attendance.studentId)?.push(attendance);
  }

  return enrollments.map((enrollment) => {
    const records = grouped.get(enrollment.student.id) || [];

    const stats: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      LEAVE: 0,
    };

    for (const r of records) {
      stats[r.status]++;
    }

    const total = records.length;

    return {
      student: enrollment.student,
      rollNumber: enrollment.rollNumber,

      summary: {
        present: stats.PRESENT,
        absent: stats.ABSENT,
        late: stats.LATE,
        leave: stats.LEAVE,
        total,
        attendancePercentage:
          total > 0 ? Math.round((stats.PRESENT / total) * 100) : 0,
      },

      records,
    };
  });
};

// =======================================================
// STUDENT SUMMARY
// =======================================================

const getStudentAttendanceSummary = async (
  studentId: string,
  academicYearId: string,
  month?: number,
  year?: number,
) => {
  const where: Prisma.StudentAttendanceWhereInput = {
    studentId,
    academicYearId,
  };

  if (month && year) {
    const { startDate, endDate } = getMonthRange(month, year);

    where.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  const records = await prisma.studentAttendance.findMany({
    where,
    select: {
      status: true,
      date: true,
      note: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  const summary: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    LEAVE: 0,
  };

  for (const r of records) {
    summary[r.status]++;
  }

  const total = records.length;

  return {
    total,
    present: summary.PRESENT,
    absent: summary.ABSENT,
    late: summary.LATE,
    leave: summary.LEAVE,

    attendancePercentage:
      total > 0 ? Math.round((summary.PRESENT / total) * 100) : 0,

    records,
  };
};

// =======================================================
// TODAY SUMMARY
// =======================================================

const getTodayAttendanceSummary = async (
  sectionId: string,
  academicYearId: string,
) => {
  const today = normalizeDate(new Date().toISOString());

  const [totalStudents, attendances] = await Promise.all([
    prisma.enrollment.count({
      where: {
        sectionId,
        academicYearId,
        isActive: true,
      },
    }),

    prisma.studentAttendance.findMany({
      where: {
        sectionId,
        academicYearId,
        date: today,
      },
      select: {
        status: true,
      },
    }),
  ]);

  const stats = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    LEAVE: 0,
  };

  for (const a of attendances) {
    stats[a.status]++;
  }

  return {
    date: today,
    totalStudents,
    present: stats.PRESENT,
    absent: stats.ABSENT,
    late: stats.LATE,
    leave: stats.LEAVE,
    notMarked: totalStudents - attendances.length,
  };
};

// =======================================================
// MARK TEACHER ATTENDANCE
// =======================================================

const markTeacherAttendance = async (payload: {
  academicYearId: string;
  date: string;
  records: Array<{
    teacherId: string;
    status: AttendanceStatus;
    note?: string;
  }>;
}) => {
  const attendanceDate = normalizeDate(payload.date);

  const operations: Prisma.PrismaPromise<any>[] = [];

  for (const record of payload.records) {
    operations.push(
      prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: {
            teacherId: record.teacherId,
            date: attendanceDate,
          },
        },

        create: {
          teacherId: record.teacherId,
          academicYearId: payload.academicYearId,
          date: attendanceDate,
          status: record.status,
          note: record.note,
        },

        update: {
          status: record.status,
          note: record.note,
        },
      }),
    );
  }

  await prisma.$transaction(operations);

  return {
    success: true,
    total: payload.records.length,
  };
};

// =======================================================
// TEACHER MONTHLY ATTENDANCE
// =======================================================

const getTeacherAttendanceByMonth = async (
  teacherId: string,
  academicYearId: string,
  month: number,
  year: number,
) => {
  const { startDate, endDate } = getMonthRange(month, year);

  const records = await prisma.teacherAttendance.findMany({
    where: {
      teacherId,
      academicYearId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },

    orderBy: {
      date: "asc",
    },
  });

  const stats: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    LEAVE: 0,
  };

  for (const r of records) {
    stats[r.status]++;
  }

  const total = records.length;

  return {
    total,
    present: stats.PRESENT,
    absent: stats.ABSENT,
    late: stats.LATE,
    leave: stats.LEAVE,

    attendancePercentage:
      total > 0 ? Math.round((stats.PRESENT / total) * 100) : 0,

    records,
  };
};

export const AttendanceService = {
  markStudentAttendance,
  getAttendanceByDate,
  getMonthlyAttendance,
  getStudentAttendanceSummary,
  getTodayAttendanceSummary,
  getTeacherAttendanceByMonth,
  markTeacherAttendance,
};
