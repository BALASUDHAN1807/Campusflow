import { prisma } from "../lib/prisma.js";
import { QueueService } from "../services/queueService.js";
import { EventService } from "../services/eventService.js";
import { AuthService } from "../services/auth.service.js";
import { UserRole, QueueStatus, TokenStatus, SmartHoldStatus, QueueEventType, NotificationType } from "@prisma/client";

async function runPart10E2ETests() {
  console.log("============================================================");
  console.log("🚀 PART 10 — CAMPUSFLOW FINAL END-TO-END VERIFICATION SUITE");
  console.log("============================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS [${total}]: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL [${total}]: ${testName}`);
      if (errorDetail) console.error("     Details:", errorDetail);
    }
  }

  try {
    // -------------------------------------------------------------
    // SETUP: Users, Service, Queue
    // -------------------------------------------------------------
    await prisma.user.upsert({
      where: { email: "staff_e2e@campusflow.demo" },
      update: {},
      create: {
        name: "Desk Officer",
        email: "staff_e2e@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STAFF,
      },
    });

    const student1 = await prisma.user.upsert({
      where: { email: "student1_e2e@campusflow.demo" },
      update: {},
      create: {
        name: "Student Priya",
        email: "student1_e2e@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const student2 = await prisma.user.upsert({
      where: { email: "student2_e2e@campusflow.demo" },
      update: {},
      create: {
        name: "Student Rahul",
        email: "student2_e2e@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const student3 = await prisma.user.upsert({
      where: { email: "student3_e2e@campusflow.demo" },
      update: {},
      create: {
        name: "Student Ananya",
        email: "student3_e2e@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    // Clean up any residual tokens/holds for test students from previous runs
    await prisma.smartHold.deleteMany({ where: { token: { userId: { in: [student1.id, student2.id, student3.id] } } } });
    await prisma.queueToken.deleteMany({ where: { userId: { in: [student1.id, student2.id, student3.id] } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [student1.id, student2.id, student3.id] } } });

    const service = await prisma.service.create({
      data: {
        name: `Examination Cell E2E ${Date.now()}`,
        description: "Official hall tickets and forms",
        active: true,
      },
    });

    const queue = await prisma.queue.create({
      data: {
        serviceId: service.id,
        status: QueueStatus.OPEN,
        maxSkips: 2, // Maximum 2 skips before tail relocation
        minLeadTime: 0,
        maxHoldDuration: 60,
      },
    });

    const queueId = queue.id;

    // -------------------------------------------------------------
    // PHASE 1 — STUDENT JOINS QUEUE
    // -------------------------------------------------------------
    const joinResult1 = await QueueService.joinQueue(queueId, student1.id);
    assert(
      joinResult1.tokenNumber === 1 && joinResult1.position === 1 && joinResult1.peopleAhead === 0,
      "Phase 1: Student 1 joins queue, Token #1 issued at position 1 with 0 ahead"
    );

    const activeTokens = await QueueService.getMyActiveTokens(student1.id);
    assert(
      activeTokens.length === 1 && activeTokens[0].tokenNumber === 1,
      "Phase 1: Student 1 active token query returns live queue status"
    );

    // -------------------------------------------------------------
    // PHASE 2 — SMART HOLD DECLARATION
    // -------------------------------------------------------------
    const now = new Date();
    const holdStart = new Date(now.getTime() - 1 * 60 * 1000); // active now
    const holdEnd = new Date(now.getTime() + 25 * 60 * 1000);  // 25 mins future

    await prisma.smartHold.create({
      data: {
        tokenId: joinResult1.tokenId,
        startTime: holdStart,
        endTime: holdEnd,
        reason: "Class from 10:00 AM to 11:00 AM",
        status: SmartHoldStatus.ACTIVE,
      },
    });

    await prisma.queueToken.update({
      where: { id: joinResult1.tokenId },
      data: { status: TokenStatus.HOLD },
    });

    await EventService.createQueueEvent(queueId, joinResult1.tokenId, QueueEventType.HOLD_DECLARED, {
      tokenNumber: 1,
      reason: "Class from 10:00 AM to 11:00 AM",
    });

    const holdRecord = await prisma.smartHold.findFirst({
      where: { token: { queueId, userId: student1.id }, status: SmartHoldStatus.ACTIVE },
    });
    assert(
      holdRecord !== null && holdRecord.reason === "Class from 10:00 AM to 11:00 AM",
      "Phase 2: Smart Hold successfully registered and persisted in database"
    );

    // -------------------------------------------------------------
    // PHASE 3 — STAFF CHECKS QUEUE ROSTER
    // -------------------------------------------------------------
    const joinResult2 = await QueueService.joinQueue(queueId, student2.id); // Student 2 joins behind Student 1
    const staffDetails = await QueueService.getStaffQueueDetails(queueId);

    const waitingToken1 = staffDetails.waitingTokens.find((t) => t.tokenNumber === 1);
    assert(
      waitingToken1?.smartHold?.isCurrentlyActive === true,
      "Phase 3: Staff queue roster clearly identifies Token #1 with active Smart Hold badge"
    );

    // -------------------------------------------------------------
    // PHASE 4 — CALL NEXT (BOUNDED FAIR-SKIP ACTIVATION)
    // -------------------------------------------------------------
    const callNext1 = await QueueService.callNext(queueId);
    assert(
      callNext1.tokenNumber === joinResult2.tokenNumber,
      "Phase 4: Call Next safely bypasses Token #1 (on hold) and immediately serves Token #2"
    );

    const token1AfterSkip = await prisma.queueToken.findUnique({ where: { id: joinResult1.tokenId } });
    assert(
      token1AfterSkip?.skipCount === 1,
      "Phase 4: Token #1 skipCount incremented to 1"
    );

    const skipEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: joinResult1.tokenId, eventType: QueueEventType.SKIPPED },
    });
    assert(
      skipEvents.length === 1,
      "Phase 4: SKIPPED audit event created in PostgreSQL"
    );

    const skipNotifs = await prisma.notification.findMany({
      where: { userId: student1.id, type: NotificationType.SKIPPED },
    });
    assert(
      skipNotifs.length >= 1,
      "Phase 4: Student 1 received in-app Notification of fair-skip"
    );

    // Complete Student 2
    await QueueService.completeToken(joinResult2.tokenId);

    // -------------------------------------------------------------
    // PHASE 5 — FAIRNESS LIMIT (MOVED TO TAIL EJECTION)
    // -------------------------------------------------------------
    // Student 3 joins behind Student 1
    const joinResult3 = await QueueService.joinQueue(queueId, student3.id);

    // Call Next again: Token 1 (skipCount=1) is skipped again -> reaches maxSkips (2) -> MOVED_TO_TAIL
    const callNext2 = await QueueService.callNext(queueId);
    assert(
      callNext2.tokenNumber === joinResult3.tokenNumber,
      "Phase 5: Token #1 reaches MAX_SKIPS limit (2) and is moved to tail; Token #3 served"
    );

    const tailEvents = await prisma.queueEvent.findMany({
      where: { queueId, tokenId: joinResult1.tokenId, eventType: QueueEventType.MOVED_TO_TAIL },
    });
    assert(
      tailEvents.length === 1,
      "Phase 5: MOVED_TO_TAIL audit event recorded in PostgreSQL"
    );

    // -------------------------------------------------------------
    // PHASE 6 — NO-SHOW INDEPENDENCE
    // -------------------------------------------------------------
    // Mark Student 3 as NO-SHOW
    await QueueService.markNoShow(joinResult3.tokenId);

    const token3Record = await prisma.queueToken.findUnique({ where: { id: joinResult3.tokenId } });
    const token3Skips = await prisma.queueEvent.findMany({
      where: { tokenId: joinResult3.tokenId, eventType: QueueEventType.SKIPPED },
    });

    assert(
      token3Record?.status === TokenStatus.NO_SHOW &&
        token3Record.skipCount === 0 &&
        token3Skips.length === 0,
      "Phase 6: NO_SHOW strictly preserves skipCount = 0 and creates ZERO fairness skip events"
    );

    // -------------------------------------------------------------
    // PHASE 7 — COMPLETION & SERVING LIFECYCLE
    // -------------------------------------------------------------
    // Token #1 is at the tail with hold expired (all skips consumed), ready to be served next
    const callNext3 = await QueueService.callNext(queueId);
    assert(
      callNext3.tokenNumber === 1 && callNext3.status === TokenStatus.SERVING,
      "Phase 7: Student 1 called to desk and becomes SERVING from queue tail"
    );

    await QueueService.completeToken(joinResult1.tokenId);
    const token1Completed = await prisma.queueToken.findUnique({ where: { id: joinResult1.tokenId } });
    assert(
      token1Completed?.status === TokenStatus.COMPLETED && !!token1Completed.completedAt,
      "Phase 7: Student 1 completed consultation successfully"
    );

    // -------------------------------------------------------------
    // PHASE 8 — REAL OPERATIONAL ANALYTICS
    // -------------------------------------------------------------
    const analytics = await QueueService.getStaffAnalytics({ queueId, timeRange: "today" });
    assert(
      analytics.summary.totalServed === 2 && // Token #2 and Token #1 completed
        analytics.summary.noShow === 1 &&    // Token #3 no-show
        analytics.summary.smartHoldCount === 1 &&
        analytics.summary.skipCount === 1 &&
        analytics.summary.movedToTailCount === 1,
      "Phase 8: Real Analytics computed accurately from PostgreSQL ground truth"
    );

    // -------------------------------------------------------------
    // PHASE 9 — COMPLETE AUDIT TRAIL LOG
    // -------------------------------------------------------------
    const allEvents = await EventService.getEvents({ queueId, pageSize: 50 });
    const eventTypes = allEvents.events.map((e) => e.eventType);

    const requiredTypes = [
      QueueEventType.JOINED,
      QueueEventType.HOLD_DECLARED,
      QueueEventType.SKIPPED,
      QueueEventType.MOVED_TO_TAIL,
      QueueEventType.SERVING,
      QueueEventType.COMPLETED,
      QueueEventType.NO_SHOW,
    ];

    const hasAllEventTypes = requiredTypes.every((type) => eventTypes.includes(type));
    assert(
      hasAllEventTypes,
      "Phase 9: Complete audit trail captures JOINED, HOLD_DECLARED, SKIPPED, MOVED_TO_TAIL, SERVING, COMPLETED, NO_SHOW"
    );

    // -------------------------------------------------------------
    // PHASE 10 — SECURITY & ROLE PRIVACY CHECKS
    // -------------------------------------------------------------
    // 1. Student public registration cannot create STAFF account
    const registered = await AuthService.register({
      name: "Attacker",
      email: `hacker_${Date.now()}@test.com`,
      password: "Password@123",
    });
    assert(
      registered.user.role === UserRole.STUDENT,
      "Phase 10: Public registration strictly enforces STUDENT role"
    );

    // 2. Student cannot view other students' events
    const student1Events = await EventService.getEvents({
      queueId,
      userId: student1.id,
      userRole: UserRole.STUDENT,
    });
    const allBelongToStudent1 = student1Events.events.every((e) => e.tokenId === joinResult1.tokenId);
    assert(
      allBelongToStudent1 && student1Events.events.length > 0,
      "Phase 10: Student event query enforces strict privacy boundaries"
    );

    // Clean up test data
    await prisma.notification.deleteMany({ where: { userId: { in: [student1.id, student2.id, student3.id, registered.user.id] } } });
    await prisma.queueEvent.deleteMany({ where: { queueId } });
    await prisma.smartHold.deleteMany({ where: { token: { queueId } } });
    await prisma.queueToken.deleteMany({ where: { queueId } });
    await prisma.queue.delete({ where: { id: queueId } });
    await prisma.service.delete({ where: { id: service.id } });
    await prisma.user.delete({ where: { id: registered.user.id } });
  } catch (error: any) {
    console.error("Test execution failed:", error);
  }

  console.log("============================================================");
  console.log(`📊 PART 10 E2E SUMMARY: ${passed} PASSED / ${total - passed} FAILED (TOTAL ${total})`);
  console.log("============================================================");
}

runPart10E2ETests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
