import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/app/shared/prisma";

async function main() {
  console.log("🌱 Starting school management seed...\n");

  // ── Admin user ─────────────────────────────────────────────
  const adminPhone    = process.env.ADMIN_PHONE    || "01700000000";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@1234";
  const adminName     = process.env.ADMIN_NAME     || "School Admin";

  const existingAdmin = await prisma.user.findUnique({ where: { phone: adminPhone } });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { name: adminName, phone: adminPhone, password: hashed, role: "ADMIN" },
    });
    console.log(`✅ Admin user created`);
    console.log(`   Phone    : ${adminPhone}`);
    console.log(`   Password : ${adminPassword}`);
  } else {
    console.log("ℹ️  Admin user already exists — skipping.");
  }

  // ── School profile ─────────────────────────────────────────
  const schoolName = process.env.SCHOOL_NAME || "Greenfield School";
  const existingSchool = await prisma.schoolProfile.findFirst();

  if (!existingSchool) {
    await prisma.schoolProfile.create({
      data: {
        name: schoolName,
        address: process.env.SCHOOL_ADDRESS || "Dhaka, Bangladesh",
        phone: process.env.SCHOOL_PHONE || "01700000001",
        email: process.env.SCHOOL_EMAIL || "info@greenfieldschool.edu.bd",
      },
    });
    console.log(`\n✅ School profile created: ${schoolName}`);
  } else {
    console.log(`\nℹ️  School profile already exists — skipping.`);
  }

  // ── Academic year ──────────────────────────────────────────
  const currentYear = new Date().getFullYear().toString();
  const existingYear = await prisma.academicYear.findUnique({ where: { year: currentYear } });

  let academicYear = existingYear;
  if (!existingYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        year: currentYear,
        isCurrent: true,
        startDate: new Date(`${currentYear}-01-01`),
        endDate:   new Date(`${currentYear}-12-31`),
      },
    });
    console.log(`✅ Academic year ${currentYear} created (set as current)`);
  } else {
    console.log(`ℹ️  Academic year ${currentYear} already exists — skipping.`);
    if (!existingYear.isCurrent) {
      await prisma.academicYear.update({ where: { id: existingYear.id }, data: { isCurrent: true } });
    }
  }

  // ── Classes 1–10 with default sections A & B ───────────────
  console.log("\n📚 Seeding classes and sections...");

  const classData = Array.from({ length: 10 }, (_, i) => ({
    name: `Class ${i + 1}`,
    numericValue: i + 1,
  }));

  let classesCreated = 0;
  let sectionsCreated = 0;

  for (const cls of classData) {
    const existingClass = await prisma.class.findFirst({
      where: { numericValue: cls.numericValue, isDeleted: false },
    });

    let classRecord = existingClass;

    if (!existingClass) {
      classRecord = await prisma.class.create({ data: cls });
      classesCreated++;
    }

    // Create sections A and B for each class
    for (const sectionName of ["A", "B"]) {
      const existingSection = await prisma.section.findUnique({
        where: { classId_name: { classId: classRecord!.id, name: sectionName } },
      });

      if (!existingSection) {
        await prisma.section.create({ data: { name: sectionName, classId: classRecord!.id } });
        sectionsCreated++;
      }
    }
  }

  console.log(`   → ${classesCreated} classes created (${10 - classesCreated} already existed)`);
  console.log(`   → ${sectionsCreated} sections created`);

  // ── Default subjects per class (Bangladesh curriculum) ────
  console.log("\n📖 Seeding default subjects...");

  const commonSubjects = ["Bangla", "English", "Mathematics", "Science", "Religion"];
  const upperSubjects  = ["History", "Geography", "Civics", "Home Science", "Agriculture"];
  const sscSubjects    = ["Physics", "Chemistry", "Biology", "Higher Math", "ICT"];

  const subjectsByClass: Record<number, string[]> = {
    1:  [...commonSubjects],
    2:  [...commonSubjects],
    3:  [...commonSubjects],
    4:  [...commonSubjects],
    5:  [...commonSubjects],
    6:  [...commonSubjects, ...upperSubjects],
    7:  [...commonSubjects, ...upperSubjects],
    8:  [...commonSubjects, ...upperSubjects],
    9:  [...commonSubjects, ...sscSubjects],
    10: [...commonSubjects, ...sscSubjects],
  };

  let subjectsCreated = 0;

  for (const cls of classData) {
    const classRecord = await prisma.class.findFirst({ where: { numericValue: cls.numericValue } });
    if (!classRecord) continue;

    const subjects = subjectsByClass[cls.numericValue] ?? commonSubjects;

    for (const subjectName of subjects) {
      const exists = await prisma.subject.findUnique({
        where: { classId_name: { classId: classRecord.id, name: subjectName } },
      });
      if (!exists) {
        await prisma.subject.create({ data: { name: subjectName, classId: classRecord.id } });
        subjectsCreated++;
      }
    }
  }

  console.log(`   → ${subjectsCreated} subjects created`);

  // ── Demo teacher ───────────────────────────────────────────
  const teacherPhone = "01711111111";
  const existingTeacher = await prisma.user.findUnique({ where: { phone: teacherPhone } });

  if (!existingTeacher) {
    const hashed = await bcrypt.hash("Teacher@1234", 10);
    const teacherUser = await prisma.user.create({
      data: { name: "Demo Teacher", phone: teacherPhone, password: hashed, role: "TEACHER" },
    });

    await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        employeeId: "TCH-2024-001",
        name: "Demo Teacher",
        phone: teacherPhone,
        gender: "Male",
        joinDate: new Date(),
      },
    });

    console.log(`\n✅ Demo teacher created`);
    console.log(`   Phone    : ${teacherPhone}`);
    console.log(`   Password : Teacher@1234`);
  } else {
    console.log("\nℹ️  Demo teacher already exists — skipping.");
  }

  // ── Summary ────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("🎉 Seed complete!");
  console.log("─".repeat(50));
  console.log("\n📋 Login credentials:");
  console.log(`   Admin   → ${adminPhone} / ${adminPassword}`);
  console.log(`   Teacher → ${teacherPhone} / Teacher@1234`);
  console.log("\n🚀 Start the server: npm run dev\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
