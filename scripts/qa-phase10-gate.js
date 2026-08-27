const http = require("http");
const { app } = require("../src/app");
const { env } = require("../src/config/env");
const { makeShareToken, verifyShareToken } = require("../src/utils/shareToken");
const { errorHandler } = require("../src/middlewares/error.middleware");
const { signToken } = require("../src/utils/jwt");

function makeHttpRequest(port, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json = {};
          try {
            json = JSON.parse(raw);
          } catch {
            json = { raw };
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runQAGate() {
  console.log("==========================================");
  console.log("STARTING PHASE 10 QA GATE VERIFICATION");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  function assert(cond, name, details = "") {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} -> ${details}`);
      failed++;
    }
  }

  // 1. TEST SHARED BOOKMARK LINK
  console.log("\n--- GATE 1: Shared Bookmark Token & Identity Leak Check ---");
  const token = makeShareToken(999);
  const verifiedUserId = verifyShareToken(token);
  assert(verifiedUserId === 999, "Token verification parses owner correctly internally");

  const invalidTokenResult = verifyShareToken("invalid.token.123");
  assert(invalidTokenResult === null, "Tampered/invalid share token returns null");

  // 2. TEST SIMULATED 500 IN PRODUCTION MODE
  console.log("\n--- GATE 2: Production Error Handler Leak Check (Simulated 500) ---");
  let mockResJson = null;
  let mockResStatus = null;
  const mockRes = {
    status(code) { mockResStatus = code; return this; },
    json(data) { mockResJson = data; return this; }
  };
  
  const originalNodeEnv = env.isProd;
  env.isProd = true;
  
  const simulatedDbError = new Error("PrismaClientKnownRequestError: SELECT `users`.`passwordHash` FROM `users` WHERE 1=1");
  simulatedDbError.stack = "Error at prisma.findMany (/node_modules/prisma/client.js:100)";
  simulatedDbError.status = 500;

  errorHandler(simulatedDbError, {}, mockRes, () => {});

  assert(mockResStatus === 500, "500 Status code returned");
  assert(mockResJson.success === false, "success is false");
  assert(mockResJson.message === "Internal server error", `Generic message returned (Got: "${mockResJson.message}")`);
  assert(mockResJson.stack === undefined, "Stack trace is not leaked in production");
  assert(!JSON.stringify(mockResJson).includes("PrismaClient"), "Prisma internals are not leaked");

  env.isProd = originalNodeEnv;

  // 3. START LOCAL HTTP SERVER
  console.log("\n--- GATE 3: Real HTTP Server Tests (Zod Strict, Bounded Pagination, Rate Limiter) ---");
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  // 3a. Test public shared bookmark endpoint without any auth
  const sharedRes = await makeHttpRequest(port, "GET", `/api/bookmarks/shared/${token}`);
  assert(sharedRes.status === 200, "Public shared bookmark endpoint returns 200 without auth header");
  assert(sharedRes.body.data && sharedRes.body.data.readOnly === true, "Shared response is marked readOnly");
  assert(!JSON.stringify(sharedRes.body).includes("email") && !JSON.stringify(sharedRes.body).includes("passwordHash"), "Shared response does not leak user details");

  // 3b. Test Zod Strict Mode on Auth Register with unknown field
  const zodRegisterRes = await makeHttpRequest(port, "POST", "/api/auth/register", {}, {
    name: "Test User",
    email: "test@example.com",
    password: "Password123",
    role: "STUDENT",
    rogueUnknownField: "malicious_input"
  });
  assert(zodRegisterRes.status === 400, "Zod .strict() rejects unknown fields on POST /api/auth/register with 400");
  assert(zodRegisterRes.body.message === "Validation failed", "Returns Validation failed message");

  // 3c. Test Bounded Pagination on Careers & Stories & Resources & Bookmarks
  const testToken = signToken({ sub: 1, email: "admin@example.com", role: "ADMIN" });
  const authHeader = { Authorization: `Bearer ${testToken}` };

  const pagBadPageAuth = await makeHttpRequest(port, "GET", "/api/careers?page=-1&limit=20", authHeader);
  assert(pagBadPageAuth.status === 400, "Pagination rejects negative page with 400 on GET /api/careers");

  const pagBadLimitAuth = await makeHttpRequest(port, "GET", "/api/careers?page=1&limit=100", authHeader);
  assert(pagBadLimitAuth.status === 400, "Pagination rejects limit > 50 with 400 on GET /api/careers");

  const pagBadLimitStories = await makeHttpRequest(port, "GET", "/api/stories?limit=999", authHeader);
  assert(pagBadLimitStories.status === 400, "Pagination rejects limit > 50 with 400 on GET /api/stories");

  const pagBadLimitResources = await makeHttpRequest(port, "GET", "/api/resources?limit=0", authHeader);
  assert(pagBadLimitResources.status === 400, "Pagination rejects limit < 1 with 400 on GET /api/resources");

  const pagBadLimitBookmarks = await makeHttpRequest(port, "GET", "/api/bookmarks?limit=abc", authHeader);
  assert(pagBadLimitBookmarks.status === 400, "Pagination rejects non-numeric limit with 400 on GET /api/bookmarks");

  // 3d. Test Zod Strict Mode on Feedback submit
  const feedbackRogue = await makeHttpRequest(port, "POST", "/api/feedback", authHeader, {
    type: "BUG",
    message: "This is a legitimate bug report with enough characters",
    status: "RESOLVED",
    unknownExtra: 123
  });
  assert(feedbackRogue.status === 400, "Zod .strict() rejects unknown fields on POST /api/feedback");

  // 3e. Test Zod Strict Mode on Saved Filters
  const savedFilterRogue = await makeHttpRequest(port, "POST", "/api/careers/saved-filters", authHeader, {
    name: "My Filter",
    filterConfig: { domain: "Engineering" },
    unrecognizedKey: "not_allowed"
  });
  assert(savedFilterRogue.status === 400, "Zod .strict() rejects unknown fields on POST /api/careers/saved-filters");

  // 3f. Test Zod Strict Mode on Stories Submit
  const storyRogue = await makeHttpRequest(port, "POST", "/api/stories", authHeader, {
    title: "My Success Story Title",
    domain: "Engineering",
    educationPath: "CS Degree at University of Test",
    challenges: "Many obstacles along the journey",
    outcome: "Secured a great role as Senior Engineer",
    status: "APPROVED"
  });
  assert(storyRogue.status === 400, "Zod .strict() rejects unknown/status fields on POST /api/stories");

  // 3g. Test Rate Limiter
  console.log("\n--- GATE 4: Rate Limiter Verification ---");
  // Test single request works
  const singleReq = await makeHttpRequest(port, "POST", "/api/feedback", authHeader, {
    type: "SUGGESTION",
    message: "This is a valid test feedback suggestion for rate limit check"
  });
  assert(singleReq.status !== 429, "Single normal write request is not blocked by rate limiter (Status: " + singleReq.status + ")");

  // Test rate limit triggers when exceeded on auth endpoints (limit: 20)
  let hitRateLimit = false;
  for (let i = 0; i < 22; i++) {
    const res = await makeHttpRequest(port, "POST", "/api/auth/login", {}, { email: "rate@test.com", password: "pwd" });
    if (res.status === 429) {
      hitRateLimit = true;
      break;
    }
  }
  assert(hitRateLimit === true, "Auth Rate limiter triggers 429 when max threshold is exceeded");

  // 4. TEST CORS CONFIGURATION
  console.log("\n--- GATE 5: CORS Headers Verification ---");
  const corsRes = await makeHttpRequest(port, "GET", "/api/health", { Origin: "http://malicious-attacker.com" });
  const allowOrigin = corsRes.headers["access-control-allow-origin"];
  assert(allowOrigin !== "*", `CORS does not return wildcard * for requests (Got: "${allowOrigin}")`);
  assert(allowOrigin === env.clientOrigin || allowOrigin === undefined, `CORS respects configured client origin (${env.clientOrigin})`);

  // 5. TEST STATIC UPLOADS DIR
  console.log("\n--- GATE 6: Static Uploads Directory Hardening ---");
  const uploadStaticRes = await makeHttpRequest(port, "GET", "/uploads/");
  assert(uploadStaticRes.status === 404 || uploadStaticRes.status === 403, `Directory listing disabled on /uploads (returns ${uploadStaticRes.status})`);

  server.close();

  console.log("\n==========================================");
  console.log(`QA GATE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runQAGate().catch((err) => {
  console.error("QA Gate runner threw an error:", err);
  process.exit(1);
});
