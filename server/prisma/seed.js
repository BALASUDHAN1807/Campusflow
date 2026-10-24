import {
  PrismaClient,
  UserRole,
  QueueStatus,
  TokenStatus,
  SmartHoldStatus,
  QueueEventType,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting CampusFlow database seed...");

  // 1. Password Hashes (Using bcryptjs with salt rounds = 10)
  const staffPasswordHash = await bcrypt.hash("Staff@123", 10);
  const studentPasswordHash = await bcrypt.hash("Student@123", 10);
  const defaultStudentPasswordHash = await bcrypt.hash("Student@123", 10);

  // 2. Demo Staff User (Upsert for idempotency)
  const staffUser = await prisma.user.upsert({
    where: { email: "staff@campusflow.demo" },
    update: {
      name: "CampusFlow Staff",
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
    },
    create: {
      name: "CampusFlow Staff",
      email: "staff@campusflow.demo",
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
    },
  });

  // 3. Primary Demo Student User
  const demoStudent = await prisma.user.upsert({
    where: { email: "student@campusflow.demo" },
    update: {
      name: "Demo Student",
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
    },
    create: {
      name: "Demo Student",
      email: "student@campusflow.demo",
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
    },
  });

  // 4. Additional 8 Fictional Student Users
  const studentData = [
    { name: "Arun Kumar", email: "arun@campusflow.demo" },
    { name: "Priya Sharma", email: "priya@campusflow.demo" },
    { name: "Rahul Raj", email: "rahul@campusflow.demo" },
    { name: "Ananya Krishnan", email: "ananya@campusflow.demo" },
    { name: "Karthik S", email: "karthik@campusflow.demo" },
    { name: "Meena Devi", email: "meena@campusflow.demo" },
    { name: "Vishal Kumar", email: "vishal@campusflow.demo" },
    { name: "Divya R", email: "divya@campusflow.demo" },
  ];

  const students = [demoStudent];

  for (const s of studentData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        passwordHash: defaultStudentPasswordHash,
        role: UserRole.STUDENT,
      },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: defaultStudentPasswordHash,
        role: UserRole.STUDENT,
      },
    });
    students.push(student);
  }

  console.log(`✅ Seeded ${students.length + 1} users (1 Staff, ${students.length} Students)`);

  // 5. Demo Services
  const servicesData = [
    {
      name: "Examination Cell",
      description: "Exam forms, hall tickets and examination-related student services.",
      active: true,
    },
    {
      name: "Accounts Office",
      description: "Fees, payments, receipts and account-related services.",
      active: true,
    },
    {
      name: "Library",
      description: "Library membership, books and library services.",
      active: true,
    },
    {
      name: "Student Affairs",
      description: "Certificates, student support and administrative services.",
      active: true,
    },
  ];

  const services = [];
  for (const s of servicesData) {
    let service = await prisma.service.findFirst({
      where: { name: s.name },
    });
    if (!service) {
      service = await prisma.service.create({
        data: s,
      });
    } else {
      service = await prisma.service.update({
        where: { id: service.id },
        data: { description: s.description, active: s.active },
      });
    }
    services.push(service);
  }

  console.log(`✅ Seeded ${services.length} services`);

  // 6. Demo Queues (1 per service with default config)
  const queues = [];
  for (const service of services) {
    let queue = await prisma.queue.findFirst({
      where: { serviceId: service.id },
    });
    if (!queue) {
      queue = await prisma.queue.create({
        data: {
          serviceId: service.id,
          status: QueueStatus.OPEN,
          maxSkips: 5,
          minLeadTime: 10,
          maxHoldDuration: 60,
        },
      });
    }
    queues.push(queue);
  }

  console.log(`✅ Seeded ${queues.length} queues`);

  // Primary active queue for demo: Examination Cell queue
  const examQueue = queues[0];
  const accountsQueue = queues[1];

  // Clean existing tokens and events in the demo queues for fresh reproducible state
  await prisma.smartHold.deleteMany({
    where: { token: { queueId: { in: queues.map((q) => q.id) } } },
  });
  await prisma.queueEvent.deleteMany({
    where: { queueId: { in: queues.map((q) => q.id) } },
  });
  await prisma.queueToken.deleteMany({
    where: { queueId: { in: queues.map((q) => q.id) } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: [...students.map((s) => s.id), staffUser.id] } },
  });

  const now = new Date();

  // 7. Demo Tokens for Examination Cell Queue
  // Token 1: SERVING
  const token1 = await prisma.queueToken.create({
    data: {
      queueId: examQueue.id,
      userId: students[1].id, // Arun Kumar
      tokenNumber: 1,
      queueOrder: 10,
      status: TokenStatus.SERVING,
      skipCount: 0,
      joinedAt: new Date(now.getTime() - 25 * 60 * 1000), // 25 mins ago
      servingAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
    },
  });

  // Token 2: HOLD (Smart Hold Active with dynamic future timestamps)
  const token2 = await prisma.queueToken.create({
    data: {
      queueId: examQueue.id,
      userId: students[2].id, // Priya Sharma
      tokenNumber: 2,
      queueOrder: 20,
      status: TokenStatus.HOLD,
      skipCount: 1,
      joinedAt: new Date(now.getTime() - 20 * 60 * 1000), // 20 mins ago
    },
  });

  // Dynamic timestamps relative to current execution time
  const dynamicHoldStart = new Date(now.getTime() - 2 * 60 * 1000); // currently active (started 2 mins ago)
  const dynamicHoldEnd = new Date(now.getTime() + 28 * 60 * 1000); // ends in 28 minutes (30 min duration)

  const smartHold1 = await prisma.smartHold.create({
    data: {
      tokenId: token2.id,
      startTime: dynamicHoldStart,
      endTime: dynamicHoldEnd,
      reason: "Class from 10:00 AM to 11:00 AM",
      status: SmartHoldStatus.ACTIVE,
    },
  });

  // Token 3: WAITING (Demo Student - position #1 active)
  const token3 = await prisma.queueToken.create({
    data: {
      queueId: examQueue.id,
      userId: demoStudent.id, // Demo Student
      tokenNumber: 3,
      queueOrder: 30,
      status: TokenStatus.WAITING,
      skipCount: 0,
      joinedAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 mins ago
    },
  });

  // Token 4: WAITING
  const token4 = await prisma.queueToken.create({
    data: {
      queueId: examQueue.id,
      userId: students[3].id, // Rahul Raj
      tokenNumber: 4,
      queueOrder: 40,
      status: TokenStatus.WAITING,
      skipCount: 0,
      joinedAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 mins ago
    },
  });

  // Token 5: WAITING
  const token5 = await prisma.queueToken.create({
    data: {
      queueId: examQueue.id,
      userId: students[4].id, // Ananya Krishnan
      tokenNumber: 5,
      queueOrder: 50,
      status: TokenStatus.WAITING,
      skipCount: 0,
      joinedAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
    },
  });

  // Accounts Queue Tokens
  const tokenAccounts1 = await prisma.queueToken.create({
    data: {
      queueId: accountsQueue.id,
      userId: students[5].id, // Karthik S
      tokenNumber: 1,
      queueOrder: 10,
      status: TokenStatus.SERVING,
      skipCount: 0,
      joinedAt: new Date(now.getTime() - 18 * 60 * 1000),
      servingAt: new Date(now.getTime() - 3 * 60 * 1000),
    },
  });

  const tokenAccounts2 = await prisma.queueToken.create({
    data: {
      queueId: accountsQueue.id,
      userId: students[6].id, // Meena Devi
      tokenNumber: 2,
      queueOrder: 20,
      status: TokenStatus.WAITING,
      skipCount: 0,
      joinedAt: new Date(now.getTime() - 8 * 60 * 1000),
    },
  });

  console.log(`✅ Seeded 7 QueueTokens (2 Serving, 1 Smart Hold, 4 Waiting)`);
  console.log(
    `✅ Seeded 1 Active SmartHold with dynamic timestamps: ${dynamicHoldStart.toISOString()} -> ${dynamicHoldEnd.toISOString()}`
  );

  // 8. Demo Queue Events (Consistent timeline)
  const events = [
    {
      queueId: examQueue.id,
      tokenId: token1.id,
      eventType: QueueEventType.JOINED,
      metadata: { tokenNumber: 1, studentName: "Arun Kumar" },
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token2.id,
      eventType: QueueEventType.JOINED,
      metadata: { tokenNumber: 2, studentName: "Priya Sharma" },
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token2.id,
      eventType: QueueEventType.HOLD_DECLARED,
      metadata: {
        tokenNumber: 2,
        reason: "Class from 10:00 AM to 11:00 AM",
        holdDurationMinutes: 30,
      },
      createdAt: new Date(now.getTime() - 18 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token3.id,
      eventType: QueueEventType.JOINED,
      metadata: { tokenNumber: 3, studentName: "Demo Student" },
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token2.id,
      eventType: QueueEventType.SKIPPED,
      metadata: {
        previousPosition: 1,
        newPosition: 2,
        skipCount: 1,
        reason: "Active Smart Hold bypass to serve available student",
      },
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token1.id,
      eventType: QueueEventType.SERVING,
      metadata: { tokenNumber: 1, desk: "Counter 01", staff: "CampusFlow Staff" },
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token4.id,
      eventType: QueueEventType.JOINED,
      metadata: { tokenNumber: 4, studentName: "Rahul Raj" },
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
    },
    {
      queueId: examQueue.id,
      tokenId: token5.id,
      eventType: QueueEventType.JOINED,
      metadata: { tokenNumber: 5, studentName: "Ananya Krishnan" },
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
  ];

  for (const evt of events) {
    await prisma.queueEvent.create({ data: evt });
  }

  console.log(`✅ Seeded ${events.length} QueueEvents with realistic history and metadata`);

  // 9. Demo Notifications
  const notifications = [
    {
      userId: demoStudent.id,
      type: NotificationType.TURN_APPROACHING,
      title: "Your Turn is Approaching",
      message:
        "You are currently #1 in the active waiting line for Examination Cell. Please proceed to the waiting area.",
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 1000),
    },
    {
      userId: demoStudent.id,
      type: NotificationType.QUEUE_UPDATE,
      title: "Queue Position Advanced",
      message: "Token 1 called to Counter 01. Your estimated wait is now ~4 minutes.",
      read: false,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    {
      userId: students[2].id, // Priya Sharma
      type: NotificationType.SMART_HOLD_ACTIVATED,
      title: "Smart Hold Confirmed",
      message:
        "Your Smart Hold is active until " +
        dynamicHoldEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        ". Bounded fair-skips will safeguard your turn.",
      read: true,
      createdAt: new Date(now.getTime() - 18 * 60 * 1000),
    },
    {
      userId: students[2].id,
      type: NotificationType.SKIPPED,
      title: "Fair-Skip Registered",
      message: "Token 1 was served while your token is on hold. Current skip count: 1 / 5.",
      read: false,
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
    {
      userId: demoStudent.id,
      type: NotificationType.SYSTEM,
      title: "Joined Examination Cell Queue",
      message: "You have been assigned Token #3 for Examination Cell.",
      read: true,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }

  console.log(`✅ Seeded ${notifications.length} Notifications`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
