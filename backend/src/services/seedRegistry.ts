import { prisma } from '../prisma/client';

export async function ensureStudentRegistrySeeded() {
  try {
    const count = await prisma.verifiedStudentRegistry.count();
    if (count > 0) return;

    const sampleStudents = [
      {
        enrollmentId: 'KIL2024CS001',
        studentName: 'Aarav Patel',
        collegeEmail: 'aarav.patel@college.edu',
        department: 'Computer Science',
        yearOfStudy: 2024,
      },
      {
        enrollmentId: 'KIL2024CS002',
        studentName: 'Riya Sharma',
        collegeEmail: 'riya.sharma@college.edu',
        department: 'Computer Science',
        yearOfStudy: 2024,
      },
      {
        enrollmentId: 'KIL2024CS003',
        studentName: 'Mohit Sadhu',
        collegeEmail: 'mohit@campify.com',
        department: 'Computer Science & Engineering',
        yearOfStudy: 2024,
      },
      {
        enrollmentId: 'KIL2024IT014',
        studentName: 'Priya Verma',
        collegeEmail: 'priya.verma@college.edu',
        department: 'Information Technology',
        yearOfStudy: 2024,
      },
      {
        enrollmentId: 'KIL2024EC022',
        studentName: 'Vikram Singh',
        collegeEmail: 'vikram.singh@college.edu',
        department: 'Electronics & Communication',
        yearOfStudy: 2024,
      },
      {
        enrollmentId: 'KIL2024CS099',
        studentName: 'Demo Student',
        collegeEmail: 'student@college.edu',
        department: 'Computer Engineering',
        yearOfStudy: 2024,
      },
      {
        enrollmentId: 'KIL2024ADM01',
        studentName: 'Campus Security Admin',
        collegeEmail: 'admin@college.edu',
        department: 'Administration & Security',
        yearOfStudy: 2024,
      },
    ];

    for (const student of sampleStudents) {
      await prisma.verifiedStudentRegistry.upsert({
        where: { enrollmentId: student.enrollmentId },
        update: {},
        create: student,
      });
    }

    console.log(`[Security Registry] Seeded ${sampleStudents.length} authoritative college student records.`);
  } catch (err) {
    console.error('[Security Registry] Seeding error:', err);
  }
}
