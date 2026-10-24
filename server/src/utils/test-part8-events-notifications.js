import { prisma } from "../lib/prisma.js";
import { QueueService } from "../services/queueService.js";
import { EventService } from "../services/eventService.js";
import { NotificationService } from "../services/notificationService.js";
import { UserRole, QueueStatus, SmartHoldStatus, QueueEventType, NotificationType } from "@prisma/client";

async function runPart8Tests() {
  console.log("============================================================");
  console.log("🧪 PART 8 — EVENT LOG + NOTIFICATION SYSTEM TEST SUITE");
  console.log("============================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, testName, errorDetail) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (errorDetail) console.error("     Details:", errorDetail);
    }
  }

  try {
    // 1. Setup Test Users (Staff & Students)
    const staff = await prisma.user.upsert({
      where: { email: "staff_p8@campusflow.demo" },
      update: {},
      create: {
        name: "Staff Auditor",
        email: "staff_p8@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STAFF,
      },
    });

    const student1 = await prisma.user.upsert({
      where: { email: "student1_p8@campusflow.demo" },
      update: {},
      create: {
        name: "Student Priya",
        email: "student1_p8@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const student2 = await prisma.user.upsert({
      where: { email: "student2_p8@campusflow.demo" },
      update: {},
      create: {
        name: "Student Rahul",
        email: "student2_p8@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    // 2. Setup Test Service & Queue
    const service = await prisma.service.create({
      data: {
        name: `Audit Test Service ${Date.now()}`,
        description: "Event log and notifications audit verification",
        active: true,
      },
    });

    const queue = await prisma.queue.create({
      data: {
        serviceId: service.id,
        status: QueueStatus.OPEN,
        maxSkips: 2,
        minLeadTime: 10,
        maxHoldDuration: 60,
      },
    });

    const queueId = queue.id;

    // Test 1: Student 1 joins queue -> JOINED event
    const token1 = await QueueService.joinQueue(queueId, student1.id);
    const joinedEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: token1.tokenId, eventType: QueueEventType.JOINED },
    });
    assert(
      joinedEvents.length === 1 && joinedEvents[0].metadata?.tokenNumber === token1.tokenNumber,
      "1. JOIN queue generates immutable JOINED QueueEvent record"
    );

    // Test 2: Student 1 declares Smart Hold -> HOLD_DECLARED event & SMART_HOLD_ACTIVATED notification
    const now = new Date();
    const holdStart = new Date(now.getTime() - 2 * 60 * 1000); // active now
    const holdEnd = new Date(now.getTime() + 20 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.smartHold.create({
        data: {
          tokenId: token1.tokenId,
          startTime: holdStart,
          endTime: holdEnd,
          reason: "Laboratory Exam",
          status: SmartHoldStatus.ACTIVE,
        },
      });

      await EventService.createQueueEvent(
        queueId,
        token1.tokenId,
        QueueEventType.HOLD_DECLARED,
        { tokenNumber: token1.tokenNumber, reason: "Laboratory Exam" },
        tx
      );

      await NotificationService.createNotification(
        student1.id,
        NotificationType.SMART_HOLD_ACTIVATED,
        "Smart Hold Active",
        `Your Smart Hold for token #${token1.tokenNumber} is active until 10:30 AM.`,
        tx
      );
    });

    const holdDeclaredEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: token1.tokenId, eventType: QueueEventType.HOLD_DECLARED },
    });
    const holdNotifs = await prisma.notification.findMany({
      where: { userId: student1.id, type: NotificationType.SMART_HOLD_ACTIVATED },
    });
    assert(
      holdDeclaredEvents.length === 1 && holdNotifs.length === 1,
      "2. HOLD_DECLARED generates QueueEvent and atomic Notification"
    );

    // Test 3: Student 2 joins queue
    const token2 = await QueueService.joinQueue(queueId, student2.id);

    // Test 4: Staff calls next -> Token 1 is skipped (Smart Hold active) -> SKIPPED event and SKIPPED notification
    const callNext1 = await QueueService.callNext(queueId);
    assert(
      callNext1.tokenId === token2.tokenId,
      "3. Call next serves eligible token 2 while skipping token 1"
    );

    const skipEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: token1.tokenId, eventType: QueueEventType.SKIPPED },
    });
    const skipNotifs = await prisma.notification.findMany({
      where: { userId: student1.id, type: NotificationType.SKIPPED },
    });
    assert(
      skipEvents.length === 1 && skipNotifs.length >= 1,
      "4. Bounded Fair-Skip creates SKIPPED event and student notification"
    );

    // Test 5: Complete token 2
    await QueueService.completeToken(token2.tokenId);
    const completeEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: token2.tokenId, eventType: QueueEventType.COMPLETED },
    });
    assert(completeEvents.length === 1, "5. COMPLETE consultation generates COMPLETED QueueEvent");

    // Test 6: Student 3 joins to test MAX SKIPS ejection (maxSkips = 2)
    const student3 = await prisma.user.upsert({
      where: { email: "student3_p8@campusflow.demo" },
      update: {},
      create: {
        name: "Student Priya 3",
        email: "student3_p8@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });
    const token3 = await QueueService.joinQueue(queueId, student3.id);

    // Call Next when Token 1 already has 1 skip -> reaches maxSkips (2) -> MOVED_TO_TAIL event and notification
    const callNext2 = await QueueService.callNext(queueId);
    assert(callNext2.tokenId === token3.tokenId, "6. Call next ejects token 1 to tail and serves token 3");

    const tailEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: token1.tokenId, eventType: QueueEventType.MOVED_TO_TAIL },
    });
    const tailNotifs = await prisma.notification.findMany({
      where: { userId: student1.id, type: NotificationType.MOVED_TO_TAIL },
    });
    assert(
      tailEvents.length === 1 && tailNotifs.length === 1,
      "7. Reaching max skips generates MOVED_TO_TAIL event and notification"
    );

    // Test 7: Staff marks token 3 as NO_SHOW -> verify NO SKIPPED or MOVED_TO_TAIL
    await QueueService.markNoShow(token3.tokenId);
    const noShowEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: token3.tokenId, eventType: QueueEventType.NO_SHOW },
    });
    const noShowTokenRecord = await prisma.queueToken.findUnique({
      where: { id: token3.tokenId },
    });
    assert(
      noShowEvents.length === 1 && noShowTokenRecord?.skipCount === 0,
      "8. NO_SHOW generates NO_SHOW event and strictly preserves skipCount = 0"
    );

    // Test 8: Pause and Resume Events
    await QueueService.pauseQueue(queueId);
    const pauseEvents = await prisma.queueEvent.findMany({
      where: { queueId, eventType: QueueEventType.QUEUE_PAUSED },
    });
    assert(pauseEvents.length >= 1, "9. PAUSE queue creates QUEUE_PAUSED event");

    await QueueService.resumeQueue(queueId);
    const resumeEvents = await prisma.queueEvent.findMany({
      where: { queueId, eventType: QueueEventType.QUEUE_RESUMED },
    });
    assert(resumeEvents.length >= 1, "10. RESUME queue creates QUEUE_RESUMED event");

    // Test 9: Event Filtering & Scoping (Staff vs Student)
    const staffEventsResult = await EventService.getEvents({
      queueId,
      userRole: UserRole.STAFF,
      userId: staff.id,
      pageSize: 50,
    });
    assert(
      staffEventsResult.events.length >= 6 && staffEventsResult.pagination.total >= 6,
      "11. Staff can view all events with pagination"
    );

    const student1EventsResult = await EventService.getEvents({
      queueId,
      userRole: UserRole.STUDENT,
      userId: student1.id,
    });
    // Student 1 should only see events where tokenId is token1
    const allStudent1 = student1EventsResult.events.every((e) => e.tokenId === token1.tokenId);
    assert(
      student1EventsResult.events.length >= 1 && allStudent1,
      "12. Student only sees events relevant to their own token (Privacy Guaranteed)"
    );

    // Test 10: Event Details Drawer
    const sampleEvent = staffEventsResult.events[0];
    const eventDetails = await EventService.getEventDetails(sampleEvent.id, staff.id, UserRole.STAFF);
    assert(
      eventDetails.id === sampleEvent.id && !!eventDetails.serviceName,
      "13. Event details drawer query returns comprehensive event metadata"
    );

    // Test 11: Notification Center & Mark As Read
    const user1NotifsBefore = await NotificationService.getUserNotifications(student1.id);
    assert(
      user1NotifsBefore.unreadCount >= 1 && user1NotifsBefore.notifications.length >= 1,
      "14. Student receives notifications with real unreadCount"
    );

    const firstNotif = user1NotifsBefore.notifications[0];
    await NotificationService.markNotificationRead(firstNotif.id, student1.id);
    const user1NotifsAfterSingle = await NotificationService.getUserNotifications(student1.id);
    assert(
      user1NotifsAfterSingle.unreadCount === user1NotifsBefore.unreadCount - 1,
      "15. Mark single notification as read decrements unreadCount"
    );

    await NotificationService.markAllRead(student1.id);
    const user1NotifsAllRead = await NotificationService.getUserNotifications(student1.id);
    assert(user1NotifsAllRead.unreadCount === 0, "16. Mark all read resets unreadCount to 0");

    // Cleanup test data
    await prisma.notification.deleteMany({
      where: { userId: { in: [student1.id, student2.id, student3.id] } },
    });
    await prisma.queueEvent.deleteMany({ where: { queueId } });
    await prisma.smartHold.deleteMany({ where: { token: { queueId } } });
    await prisma.queueToken.deleteMany({ where: { queueId } });
    await prisma.queue.delete({ where: { id: queueId } });
    await prisma.service.delete({ where: { id: service.id } });
  } catch (error) {
    console.error("Test execution failed:", error);
  }

  console.log("============================================================");
  console.log(`📊 PART 8 TEST SUMMARY: ${passed} PASSED / ${total - passed} FAILED (TOTAL ${total})`);
  console.log("============================================================");
}

runPart8Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
