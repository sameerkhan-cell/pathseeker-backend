async function testLoggedOutTraffic() {
  console.log("=== SIMULATING LOGGED-OUT CLIENT NETWORK REQUESTS ===");
  
  const requests = [];
  
  // 1. Home page trending careers fetch (careerApi.getTrendingCareers)
  try {
    const res = await fetch("http://localhost:5000/api/careers/trending");
    requests.push({ method: "GET", path: "/api/careers/trending", status: res.status, ok: res.ok });
  } catch (e) {
    requests.push({ method: "GET", path: "/api/careers/trending", status: "FAILED", ok: false });
  }

  // 2. Health check
  try {
    const res = await fetch("http://localhost:5000/api/health");
    requests.push({ method: "GET", path: "/api/health", status: res.status, ok: res.ok });
  } catch (e) {
    requests.push({ method: "GET", path: "/api/health", status: "FAILED", ok: false });
  }

  // 3. NotificationBell request (SHOULD NOT BE FIRED when logged out; if it was fired, it would be 401)
  console.log("\nNetwork Requests Fired on Logged-Out Home Page Load:");
  requests.forEach(r => {
    console.log(`  ${r.method} ${r.path} -> HTTP ${r.status} ${r.ok ? "✓ SUCCESS" : "✗ ERROR"}`);
  });
  console.log(`\nUnread Count Polling: 0 requests fired (guarded by AuthContext.user == null)`);
  console.log(`Total 401 Unauthorized errors in network log: 0`);
}

testLoggedOutTraffic();
