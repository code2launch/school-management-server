import { Router } from "express";
import { AuthRouter } from "../modules/auth/auth.routes";
import { SchoolRouter } from "../modules/school/school.routes";
import { ClassRouter } from "../modules/class/class.routes";
import { SubjectRouter } from "../modules/subject/subject.routes";
import { TeacherRouter } from "../modules/teacher/teacher.routes";
import { StudentRouter } from "../modules/student/student.routes";
import { AttendanceRouter } from "../modules/attendance/attendance.routes";
import { FeesRouter } from "../modules/fees/fees.routes";
import { ExamRouter } from "../modules/exam/exam.routes";
import { NoticeRouter } from "../modules/notice/notice.routes";
import { DashboardRouter } from "../modules/dashboard/dashboard.routes";
import { ReportRouter } from "../modules/report/report.routes";

const router = Router();

const moduleRoutes = [
  { path: "/auth",        route: AuthRouter       },
  { path: "/school",      route: SchoolRouter     },
  { path: "/classes",     route: ClassRouter      },
  { path: "/subjects",    route: SubjectRouter    },
  { path: "/teachers",    route: TeacherRouter    },
  { path: "/students",    route: StudentRouter    },
  { path: "/attendance",  route: AttendanceRouter },
  { path: "/fees",        route: FeesRouter       },
  { path: "/exams",       route: ExamRouter       },
  { path: "/notices",     route: NoticeRouter     },
  { path: "/dashboard",   route: DashboardRouter  },
  { path: "/reports",     route: ReportRouter     },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
