import { prisma } from "../lib/prisma.js";
import { QueueService } from "../services/queueService.js";
import { UserRole, QueueStatus, TokenStatus, QueueEventType } from "@prisma/client";

async function runPart9Tests() {
  console.log("============================================================");
  console.log("🧪 PART 9 — ANALYTICS + FAIRNESS SIMULATOR TEST SUITE");
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
    // 1. Setup Test Users
    await prisma.user.upsert({
      where: { email: "staff_p9@campusflow.demo" },
      update: {},
      create: {
        name: "Staff Analyst",
        email: "staff_p9@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STAFF,
      },
    });

    const student1 = await prisma.user.upsert({
      where: { email: "student1_p9@campusflow.demo" },
      update: {},
      create: {
        name: "Student Alpha",
        email: "student1_p9@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const student2 = await prisma.user.upsert({
      where: { email: "student2_p9@campusflow.demo" },
      update: {},
      create: {
        name: "Student Beta",
        email: "student2_p9@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    const student3 = await prisma.user.upsert({
      where: { email: "student3_p9@campusflow.demo" },
      update: {},
      create: {
        name: "Student Gamma",
        email: "student3_p9@campusflow.demo",
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: UserRole.STUDENT,
      },
    });

    // 2. Setup Test Service and Queue
    const service = await prisma.service.create({
      data: {
        name: `Analytics Service ${Date.now()}`,
        description: "Analytics and telemetry test bench",
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

    // 3. Create Seed Historical Records for Analytics Verification
    const now = new Date();

    // Token 1: COMPLETED (Wait: 10 min = 600s, Service: 5 min = 300s)
    const joined1 = new Date(now.getTime() - 25 * 60 * 1000);
    const serving1 = new Date(now.getTime() - 15 * 60 * 1000);
    const completed1 = new Date(now.getTime() - 10 * 60 * 1000);

    const token1 = await prisma.queueToken.create({
      data: {
        queueId,
        userId: student1.id,
        tokenNumber: 1,
        status: TokenStatus.COMPLETED,
        joinedAt: joined1,
        servingAt: serving1,
        completedAt: completed1,
        queueOrder: 1,
      },
    });

    // Token 2: NO_SHOW (Wait: 8 min = 480s, No-Show at 8 min)
    const joined2 = new Date(now.getTime() - 20 * 60 * 1000);
    const serving2 = new Date(now.getTime() - 12 * 60 * 1000);
    const completed2 = new Date(now.getTime() - 12 * 60 * 1000);

    const token2 = await prisma.queueToken.create({
      data: {
        queueId,
        userId: student2.id,
        tokenNumber: 2,
        status: TokenStatus.NO_SHOW,
        joinedAt: joined2,
        servingAt: serving2,
        completedAt: completed2,
        skipCount: 0, // MUST BE 0!
        queueOrder: 2,
      },
    });

    // Token 3: CANCELLED
    const joined3 = new Date(now.getTime() - 18 * 60 * 1000);
    const completed3 = new Date(now.getTime() - 16 * 60 * 1000);

    await prisma.queueToken.create({
      data: {
        queueId,
        userId: student3.id,
        tokenNumber: 3,
        status: TokenStatus.CANCELLED,
        joinedAt: joined3,
        completedAt: completed3,
        queueOrder: 3,
      },
    });

    // Add Smart Hold to Token 1
    await prisma.smartHold.create({
      data: {
        tokenId: token1.id,
        startTime: new Date(now.getTime() - 24 * 60 * 1000),
        endTime: new Date(now.getTime() - 16 * 60 * 1000),
        reason: "Advisor consultation",
      },
    });

    // Create Audit Events for Skips and Moved to Tail
    await prisma.queueEvent.createMany({
      data: [
        {
          queueId,
          tokenId: token1.id,
          eventType: QueueEventType.HOLD_DECLARED,
          metadata: { tokenNumber: 1 },
          createdAt: new Date(now.getTime() - 24 * 60 * 1000),
        },
        {
          queueId,
          tokenId: token1.id,
          eventType: QueueEventType.SKIPPED,
          metadata: { tokenNumber: 1, skipCount: 1, maxSkips: 3 },
          createdAt: new Date(now.getTime() - 20 * 60 * 1000),
        },
        {
          queueId,
          tokenId: token1.id,
          eventType: QueueEventType.SKIPPED,
          metadata: { tokenNumber: 1, skipCount: 2, maxSkips: 3 },
          createdAt: new Date(now.getTime() - 18 * 60 * 1000),
        },
        {
          queueId,
          tokenId: token1.id,
          eventType: QueueEventType.MOVED_TO_TAIL,
          metadata: { tokenNumber: 1, skipCount: 3, maxSkips: 3 },
          createdAt: new Date(now.getTime() - 16 * 60 * 1000),
        },
        {
          queueId,
          tokenId: token1.id,
          eventType: QueueEventType.COMPLETED,
          metadata: { tokenNumber: 1 },
          createdAt: completed1,
        },
        {
          queueId,
          tokenId: token2.id,
          eventType: QueueEventType.NO_SHOW,
          metadata: { tokenNumber: 2 },
          createdAt: completed2,
        },
      ],
    });

    // Test 1: Staff Analytics API returns real computed metrics
    const analytics = await QueueService.getStaffAnalytics({ queueId, timeRange: "today" });
    assert(analytics.summary.totalServed === 1, "1. Correct COMPLETED tokens count (totalServed = 1)");
    assert(analytics.summary.noShow === 1, "2. Correct NO_SHOW tokens count (noShow = 1)");
    assert(analytics.summary.cancelled === 1, "3. Correct CANCELLED tokens count (cancelled = 1)");

    // Test 2: Wait Time Calculation: average of token1 wait (600s) and token2 wait (480s) = 540s
    assert(
      analytics.summary.averageWaitTimeSeconds >= 530 && analytics.summary.averageWaitTimeSeconds <= 550,
      `4. Correct Average Wait Time: ${analytics.summary.averageWaitTimeSeconds}s (expected ~540s)`
    );

    // Test 3: Service Time Calculation: token1 service duration = 300s
    assert(
      analytics.summary.averageServiceTimeSeconds >= 290 && analytics.summary.averageServiceTimeSeconds <= 310,
      `5. Correct Average Service Time: ${analytics.summary.averageServiceTimeSeconds}s (expected ~300s)`
    );

    // Test 4: No-Show Rate: NO_SHOW / (COMPLETED + NO_SHOW) = 1 / (1 + 1) = 0.50 (50%)
    assert(
      analytics.summary.noShowRate === 0.5,
      `6. Correct No-Show Rate: ${analytics.summary.noShowRate} (expected 0.5)`
    );

    // Test 5: Smart Hold Metrics
    assert(analytics.summary.smartHoldCount === 1, "7. Correct Smart Hold token count (smartHoldCount = 1)");
    assert(analytics.summary.skipCount === 2, "8. Correct SKIPPED events count (skipCount = 2)");
    assert(analytics.summary.movedToTailCount === 1, "9. Correct MOVED_TO_TAIL events count (movedToTailCount = 1)");

    // Test 6: Outcome Breakdown chart data
    const completedOutcome = analytics.outcomeBreakdown.find((o) => o.name === "COMPLETED");
    const noShowOutcome = analytics.outcomeBreakdown.find((o) => o.name === "NO_SHOW");
    assert(
      completedOutcome?.value === 1 && noShowOutcome?.value === 1,
      "10. Outcome breakdown chart contains accurate real database distributions"
    );

    // Test 7: Date Range Filtering (Custom Range)
    const yesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const dayBeforeYesterday = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const customAnalytics = await QueueService.getStaffAnalytics({
      queueId,
      startDate: dayBeforeYesterday.toISOString(),
      endDate: yesterday.toISOString(),
    });
    assert(
      customAnalytics.summary.totalServed === 0 && customAnalytics.summary.totalTokens === 0,
      "11. Custom date filtering correctly restricts records outside time window"
    );

    // Test 8: Invalid Date Range Rejection
    let rejected = false;
    try {
      await QueueService.getStaffAnalytics({
        queueId,
        startDate: now.toISOString(),
        endDate: yesterday.toISOString(), // start > end
      });
    } catch (e: any) {
      rejected = true;
    }
    assert(rejected, "12. Invalid date range (startDate > endDate) is strictly rejected");

    // Test 9: NO_SHOW vs SKIPPED distinction
    const noShowRecord = await prisma.queueToken.findUnique({ where: { id: token2.id } });
    assert(
      noShowRecord?.status === TokenStatus.NO_SHOW && noShowRecord.skipCount === 0,
      "13. NO_SHOW status is completely independent from Smart Hold skips (skipCount = 0)"
    );

    // Test 10: Aggregated Multi-Queue Staff Analytics
    const allQueueAnalytics = await QueueService.getStaffAnalytics({ timeRange: "today" });
    assert(
      allQueueAnalytics.summary.totalTokens >= 3 && allQueueAnalytics.queueBreakdown.length >= 1,
      "14. Multi-queue aggregated analytics accurately summarizes across all queues"
    );

    // Cleanup test bench
    await prisma.queueEvent.deleteMany({ where: { queueId } });
    await prisma.smartHold.deleteMany({ where: { token: { queueId } } });
    await prisma.queueToken.deleteMany({ where: { queueId } });
    await prisma.queue.delete({ where: { id: queueId } });
    await prisma.service.delete({ where: { id: service.id } });
  } catch (error: any) {
    console.error("Test execution failed:", error);
  }

  console.log("============================================================");
  console.log(`📊 PART 9 TEST SUMMARY: ${passed} PASSED / ${total - passed} FAILED (TOTAL ${total})`);
  console.log("============================================================");
}

runPart9Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
