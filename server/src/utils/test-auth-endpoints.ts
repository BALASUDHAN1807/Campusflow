const BASE_URL = "http://localhost:5000/api";

async function runAuthTests() {
  console.log("==================================================");
  console.log("🧪 STARTING PART 3 AUTHENTICATION SUITE TESTS");
  console.log("==================================================");

  let studentToken = "";
  let staffToken = "";

  // ----------------------------------------------------
  // TEST 1: Login as Student
  // ----------------------------------------------------
  console.log("\n[TEST 1] Login as student (student@campusflow.demo)");
  const res1 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "student@campusflow.demo",
      password: "Student@123",
    }),
  });
  const data1 = (await res1.json()) as any;
  const rawSetCookie1 = res1.headers.get("set-cookie");
  studentToken = data1.data?.token || "";
  console.log(`Status: ${res1.status} | Success: ${data1.success} | Role: ${data1.data?.user?.role}`);
  console.log(`Cookie Set: ${rawSetCookie1 ? "Yes (campusflow_token)" : "No"}`);
  console.log(`PasswordHash exposed: ${data1.data?.user?.passwordHash ? "FAIL" : "NO - SECURE"}`);
  if (res1.status !== 200 || data1.data?.user?.role !== "STUDENT") {
    throw new Error("TEST 1 Failed");
  }

  // ----------------------------------------------------
  // TEST 2: Login as Staff
  // ----------------------------------------------------
  console.log("\n[TEST 2] Login as staff (staff@campusflow.demo)");
  const res2 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "staff@campusflow.demo",
      password: "Staff@123",
    }),
  });
  const data2 = (await res2.json()) as any;
  staffToken = data2.data?.token || "";
  console.log(`Status: ${res2.status} | Success: ${data2.success} | Role: ${data2.data?.user?.role}`);
  if (res2.status !== 200 || data2.data?.user?.role !== "STAFF") {
    throw new Error("TEST 2 Failed");
  }

  // ----------------------------------------------------
  // TEST 3: Wrong Password
  // ----------------------------------------------------
  console.log("\n[TEST 3] Wrong Password");
  const res3 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "student@campusflow.demo",
      password: "WrongPassword999",
    }),
  });
  const data3 = (await res3.json()) as any;
  console.log(`Status: ${res3.status} | Message: ${data3.message}`);
  if (res3.status !== 401) {
    throw new Error("TEST 3 Failed");
  }

  // ----------------------------------------------------
  // TEST 4: Unknown Email
  // ----------------------------------------------------
  console.log("\n[TEST 4] Unknown Email");
  const res4 = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nonexistent_user@campusflow.demo",
      password: "SomePassword123",
    }),
  });
  const data4 = (await res4.json()) as any;
  console.log(`Status: ${res4.status} | Message: ${data4.message}`);
  if (res4.status !== 401) {
    throw new Error("TEST 4 Failed");
  }

  // ----------------------------------------------------
  // TEST 5: Student accessing Staff Test API
  // ----------------------------------------------------
  console.log("\n[TEST 5] Student accessing Staff Test API (/api/staff/test)");
  const res5 = await fetch(`${BASE_URL}/staff/test`, {
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  const data5 = (await res5.json()) as any;
  console.log(`Status: ${res5.status} | Message: ${data5.message}`);
  if (res5.status !== 403) {
    throw new Error("TEST 5 Failed: Expected 403 Forbidden");
  }

  // ----------------------------------------------------
  // TEST 6: Staff accessing Staff Test API
  // ----------------------------------------------------
  console.log("\n[TEST 6] Staff accessing Staff Test API (/api/staff/test)");
  const res6 = await fetch(`${BASE_URL}/staff/test`, {
    headers: {
      Authorization: `Bearer ${staffToken}`,
    },
  });
  const data6 = (await res6.json()) as any;
  console.log(`Status: ${res6.status} | Message: ${data6.message}`);
  if (res6.status !== 200) {
    throw new Error("TEST 6 Failed");
  }

  // ----------------------------------------------------
  // TEST 7: Student accessing Student Test API
  // ----------------------------------------------------
  console.log("\n[TEST 7] Student accessing Student Test API (/api/student/test)");
  const res7 = await fetch(`${BASE_URL}/student/test`, {
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  const data7 = (await res7.json()) as any;
  console.log(`Status: ${res7.status} | Message: ${data7.message}`);
  if (res7.status !== 200) {
    throw new Error("TEST 7 Failed");
  }

  // ----------------------------------------------------
  // TEST 8: Unauthenticated Request
  // ----------------------------------------------------
  console.log("\n[TEST 8] Unauthenticated Request (/api/student/test)");
  const res8 = await fetch(`${BASE_URL}/student/test`);
  const data8 = (await res8.json()) as any;
  console.log(`Status: ${res8.status} | Message: ${data8.message}`);
  if (res8.status !== 401) {
    throw new Error("TEST 8 Failed: Expected 401 Unauthorized");
  }

  // ----------------------------------------------------
  // TEST 9: Register New Student
  // ----------------------------------------------------
  const newEmail = `alex_${Date.now()}@campusflow.demo`;
  console.log(`\n[TEST 9] Register New Student (${newEmail})`);
  const res9 = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alex Rivera",
      email: newEmail,
      password: "Password@123",
    }),
  });
  const data9 = (await res9.json()) as any;
  console.log(`Status: ${res9.status} | Success: ${data9.success} | Created Role: ${data9.data?.user?.role}`);
  if (res9.status !== 201 || data9.data?.user?.role !== "STUDENT") {
    throw new Error("TEST 9 Failed");
  }

  // ----------------------------------------------------
  // TEST 10: Attempt Registration with role: "STAFF"
  // ----------------------------------------------------
  const staffAttemptEmail = `hacker_${Date.now()}@campusflow.demo`;
  console.log(`\n[TEST 10] Attempt Registration with role: "STAFF" (${staffAttemptEmail})`);
  const res10 = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Sneaky User",
      email: staffAttemptEmail,
      password: "Password@123",
      role: "STAFF", // Attempt injection
    }),
  });
  const data10 = (await res10.json()) as any;
  console.log(`Status: ${res10.status} | Assigned Role: ${data10.data?.user?.role}`);
  if (data10.data?.user?.role !== "STUDENT") {
    throw new Error("TEST 10 Failed: Registration allowed non-STUDENT role!");
  }

  // ----------------------------------------------------
  // TEST 11: Duplicate Email Registration
  // ----------------------------------------------------
  console.log("\n[TEST 11] Duplicate Email Registration (student@campusflow.demo)");
  const res11 = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Duplicate Person",
      email: "student@campusflow.demo",
      password: "Password@123",
    }),
  });
  const data11 = (await res11.json()) as any;
  console.log(`Status: ${res11.status} | Message: ${data11.message}`);
  if (res11.status !== 409) {
    throw new Error("TEST 11 Failed: Expected 409 Conflict");
  }

  // ----------------------------------------------------
  // TEST 12: Logout
  // ----------------------------------------------------
  console.log("\n[TEST 12] Logout");
  const res12 = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
  });
  const data12 = (await res12.json()) as any;
  console.log(`Status: ${res12.status} | Message: ${data12.message}`);
  if (res12.status !== 200) {
    throw new Error("TEST 12 Failed");
  }

  // ----------------------------------------------------
  // TEST 13: GET /api/auth/me verification
  // ----------------------------------------------------
  console.log("\n[TEST 13] GET /api/auth/me (Current User Profile)");
  const res13 = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  const data13 = (await res13.json()) as any;
  console.log(`Status: ${res13.status} | User: ${data13.data?.name} | Email: ${data13.data?.email} | Role: ${data13.data?.role}`);
  console.log(`PasswordHash exposed in /me: ${data13.data?.passwordHash ? "FAIL" : "NO - SECURE"}`);
  if (res13.status !== 200 || !data13.data?.email) {
    throw new Error("TEST 13 Failed");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 13 AUTHENTICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runAuthTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
