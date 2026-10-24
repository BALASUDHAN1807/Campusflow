import {
  PrismaClient,
  UserRole,
  QueueStatus,
  TokenStatus,
  SmartHoldStatus,
  QueueEventType,
} from "@prisma/client";
import { QueueService } from "../services/queueService.js";
import { SmartHoldEngine } from "../queue-engine/smartHoldEngine.js";

const prisma = new PrismaClient();

async function runTests() {
  console.log("\n🧪 ============================================================");
  console.log("🧪 RUNNING CAMPUSFLOW PART 5 SMART HOLD & FAIR-SKIP TEST SUITE");
  console.log("🧪 ============================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error:`, err.message || err);
      failed++;
    }
  }

  // Setup test environment
  // 1. Create a dedicated test service & queue
  const testService = await prisma.service.create({
    data: {
      name: `Test Service ${Date.now()}`,
      description: "Dedicated test service",
      active: true,
    },
  });

  const testQueue = await prisma.queue.create({
    data: {
      serviceId: testService.id,
      status: QueueStatus.OPEN,
      maxSkips: 3, // Set maxSkips to 3 for explicit test scenario
      minLeadTime: 10, // 10 minutes lead time
      maxHoldDuration: 60, // 60 minutes max hold
    },
  });

  // Create 4 test students
  const studentA = await prisma.user.create({
    data: {
      name: "Student A",
      email: `studentA_${Date.now()}@test.demo`,
      passwordHash: "hash",
      role: UserRole.STUDENT,
    },
  });
  const studentB = await prisma.user.create({
    data: {
      name: "Student B",
      email: `studentB_${Date.now()}@test.demo`,
      passwordHash: "hash",
      role: UserRole.STUDENT,
    },
  });
  const studentC = await prisma.user.create({
    data: {
      name: "Student C",
      email: `studentC_${Date.now()}@test.demo`,
      passwordHash: "hash",
      role: UserRole.STUDENT,
    },
  });
  const studentD = await prisma.user.create({
    data: {
      name: "Student D",
      email: `studentD_${Date.now()}@test.demo`,
      passwordHash: "hash",
      role: UserRole.STUDENT,
    },
  });

  // Test 1: Valid Smart Hold
  await test("1. Valid Smart Hold declaration", async () => {
    await QueueService.joinQueue(testQueue.id, studentA.id);
    const startTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins in future (> 10 min lead time)
    const endTime = new Date(Date.now() + 45 * 60 * 1000).toISOString(); // 30 mins duration (<= 60 mins)

    const hold = await QueueService.declareSmartHold(testQueue.id, studentA.id, {
      startTime,
      endTime,
      reason: "Class lecture",
    });

    if (!hold.holdId || hold.status !== SmartHoldStatus.ACTIVE) {
      throw new Error("Smart hold not active or ID missing");
    }

    // Cancel this future hold so we can test other scenarios cleanly
    await QueueService.cancelSmartHold(testQueue.id, studentA.id);
  });

  // Test 2: Invalid time range (endTime <= startTime)
  await test("2. Reject invalid time range (endTime <= startTime)", async () => {
    const startTime = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // before start

    let threw = false;
    try {
      await QueueService.declareSmartHold(testQueue.id, studentA.id, {
        startTime,
        endTime,
        reason: "Invalid range",
      });
    } catch (err) {
      threw = true;
      if (!err.message.includes("End time must be strictly after start time")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have rejected invalid time range");
  });

  // Test 3: Hold too close to current time (lead time check)
  await test("3. Reject hold too close to current time (minLeadTime violated)", async () => {
    const startTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins < 10 mins lead time
    const endTime = new Date(Date.now() + 35 * 60 * 1000).toISOString();

    let threw = false;
    try {
      await QueueService.declareSmartHold(testQueue.id, studentA.id, {
        startTime,
        endTime,
        reason: "Too soon",
      });
    } catch (err) {
      threw = true;
      if (!err.message.includes("at least 10 minutes")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have rejected lead time violation");
  });

  // Test 4: Hold too long (duration > maxHoldDuration)
  await test("4. Reject hold exceeding maxHoldDuration", async () => {
    const startTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 85 * 60 * 1000).toISOString(); // 70 mins > 60 mins max

    let threw = false;
    try {
      await QueueService.declareSmartHold(testQueue.id, studentA.id, {
        startTime,
        endTime,
        reason: "Too long",
      });
    } catch (err) {
      threw = true;
      if (!err.message.includes("exceeds the maximum allowed limit")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have rejected hold duration violation");
  });

  // Test 5: Duplicate active hold
  await test("5. Reject duplicate active hold on the same token", async () => {
    const startTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    await QueueService.declareSmartHold(testQueue.id, studentA.id, {
      startTime,
      endTime,
      reason: "Hold 1",
    });

    let threw = false;
    try {
      await QueueService.declareSmartHold(testQueue.id, studentA.id, {
        startTime,
        endTime,
        reason: "Hold 2",
      });
    } catch (err) {
      threw = true;
      if (!err.message.includes("active Smart Hold already exists")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have rejected duplicate active hold");

    // Clean up hold
    await QueueService.cancelSmartHold(testQueue.id, studentA.id);
  });

  // Test 6: Student cannot modify another student's token
  await test("6. Student cannot declare or cancel hold for another student", async () => {
    let threw = false;
    try {
      // studentB has not joined yet, tries to hold
      await QueueService.declareSmartHold(testQueue.id, studentB.id, {
        startTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        reason: "Impersonation",
      });
    } catch (err) {
      threw = true;
      if (!err.message.includes("No active token found")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have rejected unauthorized user hold declaration");
  });

  // Test 7: Active hold window detection
  await test("7. Active hold window detection helper", async () => {
    const now = new Date();
    const activeHoldMock = {
      status: SmartHoldStatus.ACTIVE,
      startTime: new Date(now.getTime() - 5 * 60 * 1000), // started 5 mins ago
      endTime: new Date(now.getTime() + 25 * 60 * 1000), // ends in 25 mins
    };
    const futureHoldMock = {
      status: SmartHoldStatus.ACTIVE,
      startTime: new Date(now.getTime() + 10 * 60 * 1000), // starts in 10 mins
      endTime: new Date(now.getTime() + 40 * 60 * 1000),
    };
    const expiredHoldMock = {
      status: SmartHoldStatus.ACTIVE,
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      endTime: new Date(now.getTime() - 5 * 60 * 1000), // ended 5 mins ago
    };

    if (!SmartHoldEngine.isHoldWindowActive(activeHoldMock, now)) {
      throw new Error("Active hold should be detected as active");
    }
    if (SmartHoldEngine.isHoldWindowActive(futureHoldMock, now)) {
      throw new Error("Future hold should NOT be detected as currently active");
    }
    if (SmartHoldEngine.isHoldWindowActive(expiredHoldMock, now)) {
      throw new Error("Expired hold should NOT be detected as currently active");
    }
  });

  // Setup 4 tokens for Exact Bounded Fair-Skip Demo (A, B, C, D)
  // Let's reset the test queue tokens:
  await prisma.smartHold.deleteMany({ where: { token: { queueId: testQueue.id } } });
  await prisma.queueEvent.deleteMany({ where: { queueId: testQueue.id } });
  await prisma.queueToken.deleteMany({ where: { queueId: testQueue.id } });

  const tokenA = await QueueService.joinQueue(testQueue.id, studentA.id);
  const tokenB = await QueueService.joinQueue(testQueue.id, studentB.id);
  const tokenC = await QueueService.joinQueue(testQueue.id, studentC.id);
  const tokenD = await QueueService.joinQueue(testQueue.id, studentD.id);

  // Put Token A on active Smart Hold (startTime 5 mins ago, endTime in 25 mins)
  await prisma.smartHold.create({
    data: {
      tokenId: tokenA.tokenId,
      startTime: new Date(Date.now() - 5 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 1000),
      reason: "Physics Lab",
      status: SmartHoldStatus.ACTIVE,
    },
  });

  // Test 8: First bounded skip (A -> B A C D, skipCount = 1/3, B served)
  await test("8. First bounded fair-skip: Token A moves back 1 position, Token B served", async () => {
    const result = await QueueService.callNext(testQueue.id);

    if (result.tokenId !== tokenB.tokenId) {
      throw new Error(`Expected Token B (${tokenB.tokenId}) to be served, but got ${result.tokenId}`);
    }

    if (result.skippedActivity.length !== 1 || result.skippedActivity[0].tokenId !== tokenA.tokenId) {
      throw new Error("Token A was not recorded in skipped activity");
    }

    if (result.skippedActivity[0].skipCount !== 1) {
      throw new Error(`Expected skipCount 1, got ${result.skippedActivity[0].skipCount}`);
    }

    const updatedA = await prisma.queueToken.findUnique({ where: { id: tokenA.tokenId } });
    if (updatedA?.skipCount !== 1) {
      throw new Error(`Database skipCount should be 1, got ${updatedA?.skipCount}`);
    }

    // Complete consultation for B so next call-next is possible
    await QueueService.completeToken(tokenB.tokenId);
  });

  // Test 9: Second bounded skip (A at front -> C A D, skipCount = 2/3, C served)
  await test("9. Second bounded fair-skip: Token A moves back 1 position, Token C served", async () => {
    const result = await QueueService.callNext(testQueue.id);

    if (result.tokenId !== tokenC.tokenId) {
      throw new Error(`Expected Token C (${tokenC.tokenId}) to be served, but got ${result.tokenId}`);
    }

    if (result.skippedActivity.length !== 1 || result.skippedActivity[0].skipCount !== 2) {
      throw new Error("Token A was not skipped with skipCount 2");
    }

    const updatedA = await prisma.queueToken.findUnique({ where: { id: tokenA.tokenId } });
    if (updatedA?.skipCount !== 2) {
      throw new Error(`Database skipCount should be 2, got ${updatedA?.skipCount}`);
    }

    // Complete consultation for C
    await QueueService.completeToken(tokenC.tokenId);
  });

  // Test 10 & 11 & 12: Maximum skip reached -> Move to tail -> skipCount reset to 0 -> D served
  await test("10, 11, 12. Max skips reached: Token A moves to TAIL, skipCount resets to 0, Token D served", async () => {
    const result = await QueueService.callNext(testQueue.id);

    if (result.tokenId !== tokenD.tokenId) {
      throw new Error(`Expected Token D (${tokenD.tokenId}) to be served, but got ${result.tokenId}`);
    }

    const tailSkip = result.skippedActivity.find((s) => s.tokenId === tokenA.tokenId);
    if (!tailSkip || tailSkip.action !== "MOVED_TO_TAIL") {
      throw new Error(`Expected MOVED_TO_TAIL action, got ${tailSkip?.action}`);
    }

    const updatedA = await prisma.queueToken.findUnique({
      where: { id: tokenA.tokenId },
      include: { smartHolds: true },
    });

    if (updatedA?.skipCount !== 0) {
      throw new Error(`Expected skipCount to be reset to 0, got ${updatedA?.skipCount}`);
    }

    // Active hold should now be EXPIRED
    const activeHolds = updatedA?.smartHolds.filter((h) => h.status === SmartHoldStatus.ACTIVE);
    if (activeHolds?.length !== 0) {
      throw new Error("Active hold was not cleared/expired after reaching tail");
    }

    // Complete consultation for D
    await QueueService.completeToken(tokenD.tokenId);
  });

  // Test 13: NO_SHOW separation test (mandatory rule)
  await test("13. NO_SHOW does NOT modify skipCount or emit Smart Hold events", async () => {
    // Student A is now at the queue front with skipCount = 0 and hold cleared.
    // Call next serves Token A
    const result = await QueueService.callNext(testQueue.id);
    if (result.tokenId !== tokenA.tokenId) {
      throw new Error(`Expected Token A to be served, got ${result.tokenId}`);
    }

    // Mark Token A as NO_SHOW
    const noShowToken = await QueueService.markNoShow(tokenA.tokenId);

    if (noShowToken.status !== TokenStatus.NO_SHOW) {
      throw new Error("Token status should be NO_SHOW");
    }
    if (noShowToken.skipCount !== 0) {
      throw new Error(`skipCount should remain 0, got ${noShowToken.skipCount}`);
    }

    // Check events for tokenA
    const events = await prisma.queueEvent.findMany({
      where: { tokenId: tokenA.tokenId },
      orderBy: { createdAt: "desc" },
    });

    const latestEvent = events[0];
    if (latestEvent.eventType !== QueueEventType.NO_SHOW) {
      throw new Error(`Expected latest event NO_SHOW, got ${latestEvent.eventType}`);
    }

    // Verify no fake SKIPPED or MOVED_TO_TAIL was created by noShow
    const eventsAfterNoShow = events.filter(
      (e) =>
        (e.eventType === QueueEventType.SKIPPED || e.eventType === QueueEventType.MOVED_TO_TAIL) &&
        e.createdAt > latestEvent.createdAt
    );
    if (eventsAfterNoShow.length !== 0) {
      throw new Error("NO_SHOW triggered unexpected skip events");
    }
  });

  // Test 14: Early hold cancellation does NOT reset skipCount
  await test("14. Early hold cancellation preserves existing skipCount", async () => {
    // Create new token for Student A with an existing skipCount of 2
    const tokenA2 = await prisma.queueToken.create({
      data: {
        queueId: testQueue.id,
        userId: studentA.id,
        tokenNumber: 99,
        queueOrder: 10,
        status: TokenStatus.WAITING,
        skipCount: 2,
      },
    });

    await prisma.smartHold.create({
      data: {
        tokenId: tokenA2.id,
        startTime: new Date(Date.now() - 2 * 60 * 1000),
        endTime: new Date(Date.now() + 20 * 60 * 1000),
        reason: "Midterm Study",
        status: SmartHoldStatus.ACTIVE,
      },
    });

    // Student cancels hold early
    const cancelRes = await QueueService.cancelSmartHold(testQueue.id, studentA.id);

    if (cancelRes.skipCount !== 2) {
      throw new Error(`Expected skipCount to remain 2, got ${cancelRes.skipCount}`);
    }

    const updatedToken = await prisma.queueToken.findUnique({ where: { id: tokenA2.id } });
    if (updatedToken?.skipCount !== 2) {
      throw new Error(`Database skipCount should still be 2, got ${updatedToken?.skipCount}`);
    }

    // Clean up tokenA2
    await prisma.smartHold.deleteMany({ where: { tokenId: tokenA2.id } });
    await prisma.queueToken.delete({ where: { id: tokenA2.id } });
  });

  // Test 15: Hold Expiration
  await test("15. Hold expiration automatically marks hold as EXPIRED and preserves skipCount", async () => {
    const tokenExp = await prisma.queueToken.create({
      data: {
        queueId: testQueue.id,
        userId: studentA.id,
        tokenNumber: 100,
        queueOrder: 10,
        status: TokenStatus.HOLD,
        skipCount: 1,
      },
    });

    const expiredHold = await prisma.smartHold.create({
      data: {
        tokenId: tokenExp.id,
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() - 5 * 60 * 1000), // Ended 5 mins ago
        reason: "Completed class",
        status: SmartHoldStatus.ACTIVE,
      },
    });

    const countExpired = await QueueService.expireSmartHolds(testQueue.id);
    if (countExpired < 1) {
      throw new Error("Expected at least 1 hold to expire");
    }

    const updatedHold = await prisma.smartHold.findUnique({ where: { id: expiredHold.id } });
    if (updatedHold?.status !== SmartHoldStatus.EXPIRED) {
      throw new Error(`Expected hold status EXPIRED, got ${updatedHold?.status}`);
    }

    const updatedToken = await prisma.queueToken.findUnique({ where: { id: tokenExp.id } });
    if (updatedToken?.status !== TokenStatus.WAITING) {
      throw new Error(`Expected token status to be restored to WAITING, got ${updatedToken?.status}`);
    }
    if (updatedToken?.skipCount !== 1) {
      throw new Error(`skipCount should remain 1, got ${updatedToken?.skipCount}`);
    }

    // Clean up
    await prisma.smartHold.deleteMany({ where: { tokenId: tokenExp.id } });
    await prisma.queueToken.delete({ where: { id: tokenExp.id } });
  });

  // Test 16: Multiple held tokens in queue (A and B held, C eligible)
  await test("16. Multiple held tokens: skips A and B sequentially until C is served", async () => {
    // Clear queue
    await prisma.smartHold.deleteMany({ where: { token: { queueId: testQueue.id } } });
    await prisma.queueToken.deleteMany({ where: { queueId: testQueue.id } });

    const tokA = await QueueService.joinQueue(testQueue.id, studentA.id);
    const tokB = await QueueService.joinQueue(testQueue.id, studentB.id);
    const tokC = await QueueService.joinQueue(testQueue.id, studentC.id);

    // Both A and B are on active hold
    await prisma.smartHold.create({
      data: {
        tokenId: tokA.tokenId,
        startTime: new Date(Date.now() - 5 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 1000),
        reason: "Lab A",
        status: SmartHoldStatus.ACTIVE,
      },
    });
    await prisma.smartHold.create({
      data: {
        tokenId: tokB.tokenId,
        startTime: new Date(Date.now() - 5 * 60 * 1000),
        endTime: new Date(Date.now() + 25 * 60 * 1000),
        reason: "Lab B",
        status: SmartHoldStatus.ACTIVE,
      },
    });

    const result = await QueueService.callNext(testQueue.id);

    if (result.tokenId !== tokC.tokenId) {
      throw new Error(`Expected Token C to be served, got ${result.tokenId}`);
    }

    if (result.skippedActivity.length !== 2) {
      throw new Error(`Expected 2 skip evaluations (A and B), got ${result.skippedActivity.length}`);
    }

    // Complete C
    await QueueService.completeToken(tokC.tokenId);
  });

  // Test 17: All tokens held (Infinite loop protection)
  await test("17. Infinite loop protection: terminates safely when all active tokens are held", async () => {
    // Current queue has A and B both on active hold, no other tokens
    let threw = false;
    try {
      await QueueService.callNext(testQueue.id);
    } catch (err) {
      threw = true;
      if (!err.message.includes("All active tokens are currently unavailable due to Smart Holds")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have safely rejected when all tokens are held");
  });

  // Test 18: Concurrent CALL NEXT protection
  await test("18. Concurrent CALL NEXT safety: only 1 token becomes SERVING", async () => {
    // Clear queue and add 2 normal waiting tokens
    await prisma.smartHold.deleteMany({ where: { token: { queueId: testQueue.id } } });
    await prisma.queueToken.deleteMany({ where: { queueId: testQueue.id } });

    await QueueService.joinQueue(testQueue.id, studentA.id);
    await QueueService.joinQueue(testQueue.id, studentB.id);

    // Fire 2 simultaneous callNext requests
    const promises = [QueueService.callNext(testQueue.id), QueueService.callNext(testQueue.id)];

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(
        `Expected exactly 1 fulfilled and 1 rejected, got ${fulfilled.length} fulfilled, ${rejected.length} rejected`
      );
    }

    const servingCount = await prisma.queueToken.count({
      where: { queueId: testQueue.id, status: TokenStatus.SERVING },
    });

    if (servingCount !== 1) {
      throw new Error(`Expected exactly 1 SERVING token in DB, got ${servingCount}`);
    }
  });

  // Test 19: Queue with no waiting tokens
  await test("19. Queue with no tokens returns 404 cleanly", async () => {
    // Complete the serving token
    const serving = await prisma.queueToken.findFirst({
      where: { queueId: testQueue.id, status: TokenStatus.SERVING },
    });
    if (serving) await QueueService.completeToken(serving.id);

    // Cancel remaining waiting token
    const waiting = await prisma.queueToken.findFirst({
      where: { queueId: testQueue.id, status: TokenStatus.WAITING },
    });
    if (waiting) await QueueService.cancelToken(waiting.id, waiting.userId);

    let threw = false;
    try {
      await QueueService.callNext(testQueue.id);
    } catch (err) {
      threw = true;
      if (!err.message.includes("No waiting students in queue")) {
        throw new Error(`Unexpected message: ${err.message}`);
      }
    }
    if (!threw) throw new Error("Should have thrown 404 for empty queue");
  });

  // Test 20: Normal token becomes SERVING
  await test("20. Normal token without hold becomes SERVING immediately", async () => {
    const normalToken = await QueueService.joinQueue(testQueue.id, studentA.id);
    const result = await QueueService.callNext(testQueue.id);

    if (result.tokenId !== normalToken.tokenId || result.status !== TokenStatus.SERVING) {
      throw new Error(`Expected normal token to be SERVING, got status ${result.status}`);
    }
    if (result.skippedActivity.length !== 0) {
      throw new Error("No skips should have occurred for normal token");
    }

    // Complete token
    await QueueService.completeToken(normalToken.tokenId);
  });

  // Clean up test suite records
  await prisma.smartHold.deleteMany({ where: { token: { queueId: testQueue.id } } });
  await prisma.queueEvent.deleteMany({ where: { queueId: testQueue.id } });
  await prisma.queueToken.deleteMany({ where: { queueId: testQueue.id } });
  await prisma.queue.delete({ where: { id: testQueue.id } });
  await prisma.service.delete({ where: { id: testService.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [studentA.id, studentB.id, studentC.id, studentD.id] } },
  });

  console.log("\n============================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED / ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Fatal test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
