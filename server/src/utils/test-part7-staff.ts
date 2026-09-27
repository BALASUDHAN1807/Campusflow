import { prisma } from "../lib/prisma.js";
import { QueueService } from "../services/queueService.js";
import { UserRole, QueueStatus, TokenStatus, SmartHoldStatus } from "@prisma/client";

async function runPart7Tests() {
  console.log("============================================================");
  console.log("🧪 PART 7 — STAFF CONTROL CENTER VERIFICATION TEST SUITE");
  console.log("============================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
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
    await prisma.user.upsert({
      where: { email: "staff_test_p7@campusflow.demo" },
      update: {},
      create: {
        name: "Staff Test Operator",
        email: "staff_test_p7@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STAFF,
      },
    });


    const studentA = await prisma.user.upsert({
      where: { email: "student_a_p7@campusflow.demo" },
      update: {},
      create: {
        name: "Student Alpha",
        email: "student_a_p7@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const studentB = await prisma.user.upsert({
      where: { email: "student_b_p7@campusflow.demo" },
      update: {},
      create: {
        name: "Student Beta",
        email: "student_b_p7@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const studentC = await prisma.user.upsert({
      where: { email: "student_c_p7@campusflow.demo" },
      update: {},
      create: {
        name: "Student Gamma",
        email: "student_c_p7@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    // 2. Setup Test Service & Queue
    const service = await prisma.service.create({
      data: {
        name: `Operations Test Desk ${Date.now()}`,
        description: "Staff Control Center automated test queue",
        active: true,
      },
    });

    const queue = await prisma.queue.create({
      data: {
        serviceId: service.id,
        status: QueueStatus.OPEN,
        maxSkips: 3,
        minLeadTime: 10,
        maxHoldDuration: 60,
      },
    });

    const queueId = queue.id;

    // Test 1: Staff Queues list
    const staffQueues = await QueueService.getStaffQueues();
    const foundQueue = staffQueues.find((q) => q.queueId === queueId);
    assert(
      !!foundQueue && foundQueue.serviceName === service.name,
      "1. Staff can view all campus service queues with live metrics"
    );

    // Test 2: Staff Queue Details
    const queueDetails = await QueueService.getStaffQueueDetails(queueId);
    assert(
      queueDetails.status === QueueStatus.OPEN && queueDetails.waitingTokens.length === 0,
      "2. Staff queue details returns correct initial state"
    );

    // Test 3: Students Join Queue (A, B, C)
    const tokenA = await QueueService.joinQueue(queueId, studentA.id);
    const tokenB = await QueueService.joinQueue(queueId, studentB.id);
    const tokenC = await QueueService.joinQueue(queueId, studentC.id);

    const afterJoinDetails = await QueueService.getStaffQueueDetails(queueId);
    assert(
      afterJoinDetails.waitingTokens.length === 3 &&
        afterJoinDetails.waitingTokens[0].tokenNumber === tokenA.tokenNumber &&
        afterJoinDetails.waitingTokens[0].position === 1,
      "3. Waiting roster reflects accurate tokens and positions from backend"
    );

    // Test 4: Declare Smart Hold for Token A
    const now = new Date();
    const holdStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago (Active now)
    const holdEnd = new Date(now.getTime() + 25 * 60 * 1000); // in 25 min

    await prisma.smartHold.create({
      data: {
        tokenId: tokenA.tokenId,
        startTime: holdStart,
        endTime: holdEnd,
        reason: "Midterm Exam",
        status: SmartHoldStatus.ACTIVE,
      },
    });

    const withHoldDetails = await QueueService.getStaffQueueDetails(queueId);
    const tokenAWithHold = withHoldDetails.waitingTokens.find((t) => t.tokenId === tokenA.tokenId);
    assert(
      tokenAWithHold?.smartHold?.isCurrentlyActive === true,
      "4. Smart Hold token correctly marked ACTIVE in staff roster"
    );

    // Test 5: Call Next triggers Bounded Fair-Skip (A is skipped, B becomes SERVING)
    const call1 = await QueueService.callNext(queueId);
    assert(
      call1.tokenId === tokenB.tokenId &&
        call1.tokenNumber === tokenB.tokenNumber &&
        call1.skippedActivity.length === 1 &&
        call1.skippedActivity[0].action === "SKIPPED" &&
        call1.skippedActivity[0].skipCount === 1,
      "5. CALL NEXT skips active Smart Hold token A and calls eligible token B"
    );

    // Test 6: Complete Consultation for Token B
    const completeB = await QueueService.completeToken(tokenB.tokenId);
    assert(
      completeB.status === TokenStatus.COMPLETED,
      "6. Staff COMPLETE marks serving token as COMPLETED"
    );

    // Test 7: Call Next again (A skipped 2nd time, C called)
    const call2 = await QueueService.callNext(queueId);
    assert(
      call2.tokenId === tokenC.tokenId &&
        call2.skippedActivity.length === 1 &&
        call2.skippedActivity[0].skipCount === 2,
      "7. Second CALL NEXT increments skip count to 2/3 and calls token C"
    );

    // Test 8: Mark Token C as NO-SHOW
    const noShowC = await QueueService.markNoShow(tokenC.tokenId);
    assert(
      noShowC.status === TokenStatus.NO_SHOW,
      "8. Staff NO-SHOW marks serving token as NO_SHOW (independent of skips)"
    );

    // Test 9: Student D joins to test MAX SKIPS limit ejection
    const studentD = await prisma.user.upsert({
      where: { email: "student_d_p7@campusflow.demo" },
      update: {},
      create: {
        name: "Student Delta",
        email: "student_d_p7@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });
    const tokenD = await QueueService.joinQueue(queueId, studentD.id);

    // Call Next when Token A has skipCount=2 and maxSkips=3 -> Token A hits max skips, MOVED_TO_TAIL, token D is called
    const call3 = await QueueService.callNext(queueId);
    assert(
      call3.tokenId === tokenD.tokenId &&
        call3.skippedActivity.some((s) => s.action === "MOVED_TO_TAIL"),
      "9. Maximum skips reached: token A ejected to TAIL and skip count reset"
    );

    // Test 10: Pause and Resume Queue
    const pausedQueue = await QueueService.pauseQueue(queueId);
    assert(pausedQueue.status === QueueStatus.PAUSED, "10. Staff can PAUSE queue");

    const resumedQueue = await QueueService.resumeQueue(queueId);
    assert(resumedQueue.status === QueueStatus.OPEN, "11. Staff can RESUME queue");

    // Test 11: Update Queue Configuration (PATCH /api/queue/:queueId/config)
    const updatedConfig = await QueueService.updateQueueConfig(queueId, {
      maxSkips: 5,
      minLeadTime: 15,
      maxHoldDuration: 90,
    });
    assert(
      updatedConfig.maxSkips === 5 &&
        updatedConfig.minLeadTime === 15 &&
        updatedConfig.maxHoldDuration === 90,
      "12. Staff can update queue configuration (maxSkips, minLeadTime, maxHoldDuration)"
    );

    // Test 12: Real Analytics Aggregation
    const analytics = await QueueService.getStaffAnalytics({ queueId, timeRange: "today" });
    assert(
      analytics.summary.completed >= 1 &&
        analytics.summary.noShow >= 1 &&
        analytics.summary.smartHoldSkips >= 2 &&
        analytics.summary.movedToTail >= 1,
      "13. Analytics engine computes accurate real metrics from PostgreSQL"
    );

    // Test 13: Close Queue
    const closedQueue = await QueueService.closeQueue(queueId);
    assert(closedQueue.status === QueueStatus.CLOSED, "14. Staff can CLOSE queue with history preserved");

    // Cleanup test data
    await prisma.queueEvent.deleteMany({ where: { queueId } });
    await prisma.smartHold.deleteMany({ where: { token: { queueId } } });
    await prisma.queueToken.deleteMany({ where: { queueId } });
    await prisma.queue.delete({ where: { id: queueId } });
    await prisma.service.delete({ where: { id: service.id } });
  } catch (error: any) {
    console.error("Test execution failed:", error);
  }

  console.log("============================================================");
  console.log(`📊 PART 7 TEST SUMMARY: ${passed} PASSED / ${total - passed} FAILED (TOTAL ${total})`);
  console.log("============================================================");
}

runPart7Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
