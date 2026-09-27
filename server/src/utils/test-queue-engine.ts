import { prisma } from "../lib/prisma.js";

const BASE_URL = "http://localhost:5000/api";

async function runQueueEngineTests() {
  console.log("==================================================");
  console.log("🚀 STARTING PART 4 QUEUE ENGINE & TOKEN LIFECYCLE TESTS");
  console.log("==================================================");

  // 1. Authenticate Demo Users to obtain JWT tokens
  const studentRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@campusflow.demo", password: "Student@123" }),
  });
  const studentData = (await studentRes.json()) as any;
  const studentToken = studentData.data?.token;

  const staffRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "staff@campusflow.demo", password: "Staff@123" }),
  });
  const staffData = (await staffRes.json()) as any;
  const staffToken = staffData.data?.token;

  // Secondary students for multi-student tests
  const arunRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "arun@campusflow.demo", password: "Student@123" }),
  });
  const arunToken = ((await arunRes.json()) as any).data?.token;

  const priyaRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "priya@campusflow.demo", password: "Student@123" }),
  });
  const priyaToken = ((await priyaRes.json()) as any).data?.token;

  const rahulRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rahul@campusflow.demo", password: "Student@123" }),
  });
  const rahulToken = ((await rahulRes.json()) as any).data?.token;

  // Find target queues
  const servicesRes = await fetch(`${BASE_URL}/services`);
  const servicesData = ((await servicesRes.json()) as any).data;
  const libService = servicesData.find((s: any) => s.name === "Library");
  const testQueueId = libService.queues[0].id;

  // Clean library queue tokens for test predictability
  await prisma.queueToken.deleteMany({ where: { queueId: testQueueId } });
  await prisma.queue.update({ where: { id: testQueueId }, data: { status: "OPEN" } });

  // ----------------------------------------------------
  // TEST 1: Student joins OPEN queue
  // ----------------------------------------------------
  console.log("\n[TEST 1] Student joins OPEN queue (Library)");
  const res1 = await fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data1 = (await res1.json()) as any;
  console.log(`Status: ${res1.status} | Token Number: ${data1.data?.tokenNumber} | Position: ${data1.data?.position} | Ahead: ${data1.data?.peopleAhead}`);
  if (res1.status !== 201 || data1.data?.position !== 1 || data1.data?.peopleAhead !== 0) {
    throw new Error("TEST 1 Failed");
  }
  const studentTokenId = data1.data.tokenId;

  // ----------------------------------------------------
  // TEST 2: Same student joins same queue again (Duplicate Prevention)
  // ----------------------------------------------------
  console.log("\n[TEST 2] Same student joins same queue again");
  const res2 = await fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data2 = (await res2.json()) as any;
  console.log(`Status: ${res2.status} | Message: ${data2.message}`);
  if (res2.status !== 409) {
    throw new Error("TEST 2 Failed: Expected 409 Conflict");
  }

  // ----------------------------------------------------
  // TEST 3: Student joins PAUSED queue
  // ----------------------------------------------------
  console.log("\n[TEST 3] Student joins PAUSED queue");
  await prisma.queue.update({ where: { id: testQueueId }, data: { status: "PAUSED" } });
  const res3 = await fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${arunToken}` },
  });
  const data3 = (await res3.json()) as any;
  console.log(`Status: ${res3.status} | Message: ${data3.message}`);
  if (res3.status !== 400) {
    throw new Error("TEST 3 Failed: Expected 400 Bad Request");
  }
  await prisma.queue.update({ where: { id: testQueueId }, data: { status: "OPEN" } });

  // ----------------------------------------------------
  // TEST 4: Student joins CLOSED queue
  // ----------------------------------------------------
  console.log("\n[TEST 4] Student joins CLOSED queue");
  await prisma.queue.update({ where: { id: testQueueId }, data: { status: "CLOSED" } });
  const res4 = await fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${arunToken}` },
  });
  const data4 = (await res4.json()) as any;
  console.log(`Status: ${res4.status} | Message: ${data4.message}`);
  if (res4.status !== 400) {
    throw new Error("TEST 4 Failed: Expected 400 Bad Request");
  }
  await prisma.queue.update({ where: { id: testQueueId }, data: { status: "OPEN" } });

  // ----------------------------------------------------
  // TEST 5: Second student joins -> Different token numbers
  // ----------------------------------------------------
  console.log("\n[TEST 5] Second student joins (Arun)");
  const res5 = await fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${arunToken}` },
  });
  const data5 = (await res5.json()) as any;
  console.log(`Status: ${res5.status} | Token Number: ${data5.data?.tokenNumber} | Position: ${data5.data?.position} | Ahead: ${data5.data?.peopleAhead}`);
  if (res5.status !== 201 || data5.data?.tokenNumber === data1.data?.tokenNumber || data5.data?.position !== 2) {
    throw new Error("TEST 5 Failed");
  }
  const arunTokenId = data5.data.tokenId;

  // ----------------------------------------------------
  // TEST 6: Concurrent Simultaneous Joins
  // ----------------------------------------------------
  console.log("\n[TEST 6] Two students join simultaneously (Priya & Rahul)");
  const [res6A, res6B] = await Promise.all([
    fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${priyaToken}` },
    }),
    fetch(`${BASE_URL}/queue/${testQueueId}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${rahulToken}` },
    }),
  ]);
  const data6A = (await res6A.json()) as any;
  const data6B = (await res6B.json()) as any;
  console.log(`Token A: #${data6A.data?.tokenNumber} (Pos ${data6A.data?.position}) | Token B: #${data6B.data?.tokenNumber} (Pos ${data6B.data?.position})`);
  if (data6A.data?.tokenNumber === data6B.data?.tokenNumber) {
    throw new Error("TEST 6 Failed: Duplicate token number generated under concurrency!");
  }

  // ----------------------------------------------------
  // TEST 7: Staff calls next
  // ----------------------------------------------------
  console.log("\n[TEST 7] Staff calls next");
  const res7 = await fetch(`${BASE_URL}/queue/${testQueueId}/call-next`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data7 = (await res7.json()) as any;
  console.log(`Status: ${res7.status} | Serving Token: #${data7.data?.tokenNumber} | Student: ${data7.data?.studentName}`);
  if (res7.status !== 200 || data7.data?.status !== "SERVING" || data7.data?.tokenNumber !== 1) {
    throw new Error("TEST 7 Failed");
  }

  // ----------------------------------------------------
  // TEST 8: Staff calls next while another token is SERVING
  // ----------------------------------------------------
  console.log("\n[TEST 8] Staff calls next while another token is SERVING");
  const res8 = await fetch(`${BASE_URL}/queue/${testQueueId}/call-next`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data8 = (await res8.json()) as any;
  console.log(`Status: ${res8.status} | Message: ${data8.message}`);
  if (res8.status !== 400) {
    throw new Error("TEST 8 Failed: Expected 400 Bad Request");
  }

  // ----------------------------------------------------
  // TEST 9: Staff completes serving token
  // ----------------------------------------------------
  console.log("\n[TEST 9] Staff completes serving token");
  const res9 = await fetch(`${BASE_URL}/token/${studentTokenId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data9 = (await res9.json()) as any;
  console.log(`Status: ${res9.status} | New Status: ${data9.data?.status} | CompletedAt: ${data9.data?.completedAt}`);
  if (res9.status !== 200 || data9.data?.status !== "COMPLETED") {
    throw new Error("TEST 9 Failed");
  }

  // ----------------------------------------------------
  // TEST 10: Staff calls next and marks serving token NO_SHOW
  // ----------------------------------------------------
  console.log("\n[TEST 10] Staff calls next and marks token NO_SHOW");
  // Call next (Arun)
  await fetch(`${BASE_URL}/queue/${testQueueId}/call-next`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  // Mark NO_SHOW
  const res10 = await fetch(`${BASE_URL}/token/${arunTokenId}/no-show`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data10 = (await res10.json()) as any;
  console.log(`Status: ${res10.status} | New Status: ${data10.data?.status} | skipCount: ${data10.data?.skipCount}`);
  if (res10.status !== 200 || data10.data?.status !== "NO_SHOW" || data10.data?.skipCount !== 0) {
    throw new Error("TEST 10 Failed: NO_SHOW modified skipCount or status incorrect!");
  }

  // ----------------------------------------------------
  // TEST 11: Student cancels own WAITING token
  // ----------------------------------------------------
  console.log("\n[TEST 11] Student cancels own WAITING token (Priya)");
  const priyaTokenId = data6A.data?.tokenId;
  const res11 = await fetch(`${BASE_URL}/token/${priyaTokenId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${priyaToken}` },
  });
  const data11 = (await res11.json()) as any;
  console.log(`Status: ${res11.status} | New Status: ${data11.data?.status}`);
  if (res11.status !== 200 || data11.data?.status !== "CANCELLED") {
    throw new Error("TEST 11 Failed");
  }

  // ----------------------------------------------------
  // TEST 12: Student tries to cancel another student's token
  // ----------------------------------------------------
  console.log("\n[TEST 12] Student tries to cancel another student's token");
  const rahulTokenId = data6B.data?.tokenId;
  const res12 = await fetch(`${BASE_URL}/token/${rahulTokenId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data12 = (await res12.json()) as any;
  console.log(`Status: ${res12.status} | Message: ${data12.message}`);
  if (res12.status !== 403) {
    throw new Error("TEST 12 Failed: Expected 403 Forbidden");
  }

  // ----------------------------------------------------
  // TEST 13: Student tries to call next
  // ----------------------------------------------------
  console.log("\n[TEST 13] Student tries to call next");
  const res13 = await fetch(`${BASE_URL}/queue/${testQueueId}/call-next`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data13 = (await res13.json()) as any;
  console.log(`Status: ${res13.status} | Message: ${data13.message}`);
  if (res13.status !== 403) {
    throw new Error("TEST 13 Failed: Expected 403 Forbidden");
  }

  // ----------------------------------------------------
  // TEST 14: Student tries to pause queue
  // ----------------------------------------------------
  console.log("\n[TEST 14] Student tries to pause queue");
  const res14 = await fetch(`${BASE_URL}/queue/${testQueueId}/pause`, {
    method: "POST",
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data14 = (await res14.json()) as any;
  console.log(`Status: ${res14.status} | Message: ${data14.message}`);
  if (res14.status !== 403) {
    throw new Error("TEST 14 Failed: Expected 403 Forbidden");
  }

  // ----------------------------------------------------
  // TEST 15: Staff pauses queue
  // ----------------------------------------------------
  console.log("\n[TEST 15] Staff pauses queue");
  const res15 = await fetch(`${BASE_URL}/queue/${testQueueId}/pause`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data15 = (await res15.json()) as any;
  console.log(`Status: ${res15.status} | Queue Status: ${data15.data?.status}`);
  if (res15.status !== 200 || data15.data?.status !== "PAUSED") {
    throw new Error("TEST 15 Failed");
  }

  // ----------------------------------------------------
  // TEST 16: Staff resumes queue
  // ----------------------------------------------------
  console.log("\n[TEST 16] Staff resumes queue");
  const res16 = await fetch(`${BASE_URL}/queue/${testQueueId}/resume`, {
    method: "POST",
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data16 = (await res16.json()) as any;
  console.log(`Status: ${res16.status} | Queue Status: ${data16.data?.status}`);
  if (res16.status !== 200 || data16.data?.status !== "OPEN") {
    throw new Error("TEST 16 Failed");
  }

  // ----------------------------------------------------
  // TEST 17: Queue Status & Dynamic Position Calculation
  // ----------------------------------------------------
  console.log("\n[TEST 17] Queue Status and Dynamic Position Calculation");
  const res17 = await fetch(`${BASE_URL}/queue/${testQueueId}/status`, {
    headers: { Authorization: `Bearer ${rahulToken}` },
  });
  const data17 = (await res17.json()) as any;
  console.log(`Status: ${res17.status} | Total Waiting: ${data17.data?.totalWaiting} | Rahul Position: ${data17.data?.myToken?.position} | People Ahead: ${data17.data?.myToken?.peopleAhead}`);
  if (data17.data?.myToken?.position !== 1 || data17.data?.myToken?.peopleAhead !== 0) {
    throw new Error("TEST 17 Failed: Dynamic position incorrect!");
  }

  // ----------------------------------------------------
  // TEST 18, 19, 20: Inactive Tokens excluded from Position
  // ----------------------------------------------------
  console.log("\n[TEST 18, 19, 20] Verifying Cancelled, Completed, and NO_SHOW tokens are excluded from active position calculation");
  const cancelledPos = await fetch(`${BASE_URL}/token/${priyaTokenId}`, {
    headers: { Authorization: `Bearer ${priyaToken}` },
  });
  const dataCancelled = (await cancelledPos.json()) as any;
  console.log(`Cancelled Token Position: ${dataCancelled.data?.position} (Expected null)`);

  const completedPos = await fetch(`${BASE_URL}/token/${studentTokenId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const dataCompleted = (await completedPos.json()) as any;
  console.log(`Completed Token Position: ${dataCompleted.data?.position} (Expected null)`);

  const noShowPos = await fetch(`${BASE_URL}/token/${arunTokenId}`, {
    headers: { Authorization: `Bearer ${arunToken}` },
  });
  const dataNoShow = (await noShowPos.json()) as any;
  console.log(`NO_SHOW Token Position: ${dataNoShow.data?.position} (Expected null)`);

  if (dataCancelled.data?.position !== null || dataCompleted.data?.position !== null || dataNoShow.data?.position !== null) {
    throw new Error("TEST 18-20 Failed: Inactive tokens should have null position!");
  }

  // ----------------------------------------------------
  // TEST 21: Staff Queue Statistics
  // ----------------------------------------------------
  console.log("\n[TEST 21] Staff Queue Statistics Endpoint (/api/queue/:queueId/stats)");
  const res21 = await fetch(`${BASE_URL}/queue/${testQueueId}/stats`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data21 = (await res21.json()) as any;
  console.log("Queue Statistics Result:", data21.data);
  if (data21.data?.completed !== 1 || data21.data?.noShow !== 1 || data21.data?.cancelled !== 1 || data21.data?.waiting !== 1) {
    throw new Error("TEST 21 Failed: Queue stats mismatch!");
  }

  // ----------------------------------------------------
  // TEST 22: Staff Event Audit Stream (/api/queue/:queueId/events)
  // ----------------------------------------------------
  console.log("\n[TEST 22] Staff Queue Events Stream (/api/queue/:queueId/events)");
  const res22 = await fetch(`${BASE_URL}/queue/${testQueueId}/events`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const data22 = (await res22.json()) as any;
  console.log(`Audit Events Count: ${data22.data?.length} events recorded`);
  if (!data22.data || data22.data.length < 5) {
    throw new Error("TEST 22 Failed: Audit events stream missing!");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 22 QUEUE ENGINE & TOKEN LIFECYCLE TESTS PASSED!");
  console.log("==================================================");
}

runQueueEngineTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
