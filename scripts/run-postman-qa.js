const http = require("http");
const { app } = require("../src/app");
const { env } = require("../src/config/env");

function request(port, method, path, headers = {}, body = null) {
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

async function runPostmanQA() {
  console.log("==========================================================");
  console.log("🚀 STARTING AUTOMATED POSTMAN COLLECTION SUITE (FR-01–FR-21)");
  console.log("==========================================================");

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

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  let studentToken = "";
  let adminToken = "";
  let shareToken = "";
  let resourceId = "";

  try {
    // 01. AUTH MODULE
    console.log("\n📁 Module 01: Auth (FR-01, FR-02)");
    const regRes = await request(port, "POST", "/api/auth/register", {}, {
      name: "New Candidate",
      email: `candidate.${Date.now()}@pathseeker.com`,
      password: "Password123",
      role: "STUDENT",
    });
    assert(regRes.status === 201 && regRes.body.success === true, "01.01 User Register (FR-01)");

    const loginStudentRes = await request(port, "POST", "/api/auth/login", {}, {
      email: "student@pathseeker.com",
      password: "StudentPass123",
    });
    assert(loginStudentRes.status === 200 && loginStudentRes.body.data.token, "01.02 User Login - Student (FR-02)");
    studentToken = loginStudentRes.body.data.token;

    const loginAdminRes = await request(port, "POST", "/api/auth/admin/login", {}, {
      email: "admin@pathseeker.com",
      password: "AdminPass123",
    });
    assert(loginAdminRes.status === 200 && loginAdminRes.body.data.token, "01.03 Admin Login (FR-02)");
    adminToken = loginAdminRes.body.data.token;

    const meRes = await request(port, "GET", "/api/auth/me", { Authorization: `Bearer ${studentToken}` });
    assert(meRes.status === 200 && meRes.body.data.user.role === "STUDENT", "01.04 Get Current User /me (FR-02)");

    // 02. PROFILE MODULE
    console.log("\n📁 Module 02: Profile (FR-03)");
    const getProfileRes = await request(port, "GET", "/api/profile/me", { Authorization: `Bearer ${studentToken}` });
    assert(getProfileRes.status === 200 && getProfileRes.body.data.profile, "02.01 Get My Profile (FR-03)");

    const updateProfileRes = await request(port, "PUT", "/api/profile/me", { Authorization: `Bearer ${studentToken}` }, {
      phone: "+1-555-0999",
      bio: "Updated student bio for career assessment",
      skills: ["React", "Node.js", "TypeScript", "SQL"],
    });
    assert(updateProfileRes.status === 200 && updateProfileRes.body.data.profile.phone === "+1-555-0999", "02.02 Update Profile (FR-03)");

    // 03. CAREER BANK MODULE
    console.log("\n📁 Module 03: Career Bank (FR-04, FR-05, FR-06)");
    const listCareersRes = await request(port, "GET", "/api/careers?domain=Engineering&demand=HIGH&page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(listCareersRes.status === 200 && listCareersRes.body.data.items.length > 0, "03.01 List Careers with Filters (FR-04)");

    const careerId = listCareersRes.body.data.items[0].id;
    const getCareerRes = await request(port, "GET", `/api/careers/${careerId}`, { Authorization: `Bearer ${studentToken}` });
    assert(getCareerRes.status === 200 && getCareerRes.body.data.career.title, "03.02 Get Career Detail by ID (FR-05)");

    const saveFilterRes = await request(port, "POST", "/api/careers/saved-filters", { Authorization: `Bearer ${studentToken}` }, {
      name: "High Demand Cloud Filters",
      filterConfig: { domain: "Engineering", demand: "HIGH" },
    });
    assert(saveFilterRes.status === 201 && saveFilterRes.body.data.savedFilter, "03.03 Save Career Filter (FR-06)");

    const getSavedFiltersRes = await request(port, "GET", "/api/careers/saved-filters", { Authorization: `Bearer ${studentToken}` });
    assert(getSavedFiltersRes.status === 200 && getSavedFiltersRes.body.data.savedFilters.length > 0, "03.04 Get Saved Filters (FR-06)");

    // 04. QUIZ MODULE
    console.log("\n📁 Module 04: Quiz (FR-07, FR-08)");
    const activeQuizzesRes = await request(port, "GET", "/api/quiz/active", { Authorization: `Bearer ${studentToken}` });
    assert(activeQuizzesRes.status === 200 && activeQuizzesRes.body.data.quizzes.length > 0, "04.01 List Active Quizzes (FR-07)");

    const quizId = activeQuizzesRes.body.data.quizzes[0].id;
    const startQuizRes = await request(port, "GET", `/api/quiz/${quizId}/start`, { Authorization: `Bearer ${studentToken}` });
    assert(startQuizRes.status === 200 && startQuizRes.body.data.questions.length >= 3, "04.02 Start Quiz - Fetch Questions (FR-07)");

    const submitQuizRes = await request(port, "POST", `/api/quiz/${quizId}/submit`, { Authorization: `Bearer ${studentToken}` }, {
      startedAt: new Date(Date.now() - 600000).toISOString(),
      submittedAt: new Date().toISOString(),
      answers: [
        { questionId: startQuizRes.body.data.questions[0].id, selectedOptionId: "opt_eng" },
        { questionId: startQuizRes.body.data.questions[1].id, selectedOptionId: "likert_5" },
        { questionId: startQuizRes.body.data.questions[2].id, sliderValue: 85 },
      ],
    });
    assert(submitQuizRes.status === 201 && submitQuizRes.body.data.attempt.score >= 0, "04.03 Submit Quiz Attempt (FR-08)");

    const quizHistoryRes = await request(port, "GET", "/api/quiz/history?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(quizHistoryRes.status === 200 && quizHistoryRes.body.data.attempts.length > 0, "04.04 Get Quiz History (FR-08)");

    // 05. MULTIMEDIA MODULE
    console.log("\n📁 Module 05: Multimedia Center (FR-09, FR-10)");
    const listMediaRes = await request(port, "GET", "/api/media?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(listMediaRes.status === 200 && listMediaRes.body.data.items.length > 0, "05.01 List Media Items (FR-09)");

    const mediaId = listMediaRes.body.data.items[0].id;
    const getMediaRes = await request(port, "GET", `/api/media/${mediaId}`, { Authorization: `Bearer ${studentToken}` });
    assert(getMediaRes.status === 200 && getMediaRes.body.data.media.title, "05.02 Get Media Detail by ID (FR-09)");

    const rateMediaRes = await request(port, "POST", `/api/media/${mediaId}/rating`, { Authorization: `Bearer ${studentToken}` }, {
      rating: 5,
    });
    assert((rateMediaRes.status === 200 || rateMediaRes.status === 201) && rateMediaRes.body.success === true, "05.03 Rate Media (FR-10)");

    const ratingSummaryRes = await request(port, "GET", `/api/media/${mediaId}/rating-summary`, { Authorization: `Bearer ${studentToken}` });
    assert(ratingSummaryRes.status === 200 && (ratingSummaryRes.body.data.average > 0 || ratingSummaryRes.body.data.count > 0), "05.04 Get Media Rating Summary (FR-10)");

    // 06. SUCCESS STORIES MODULE
    console.log("\n📁 Module 06: Success Stories (FR-11, FR-12)");
    const listStoriesRes = await request(port, "GET", "/api/stories?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(listStoriesRes.status === 200 && listStoriesRes.body.data.items.length > 0, "06.01 List Approved Stories (FR-11)");

    const submitStoryRes = await request(port, "POST", "/api/stories", { Authorization: `Bearer ${studentToken}` }, {
      title: "How I Transitioned into Cloud Architecture",
      domain: "Engineering",
      educationPath: "Online university degrees and hands-on laboratory certifications",
      challenges: "Learning distributed networking and high-availability patterns",
      outcome: "Secured a role as an Enterprise Cloud Architect",
    });
    assert(submitStoryRes.status === 201 && submitStoryRes.body.data.story.status === "PENDING", "06.02 Submit User Story (FR-11)");

    const newStoryId = submitStoryRes.body.data.story.id;
    const adminListStoriesRes = await request(port, "GET", "/api/admin/stories?status=PENDING&page=1&limit=10", { Authorization: `Bearer ${adminToken}` });
    assert(adminListStoriesRes.status === 200 && adminListStoriesRes.body.data.items.length > 0, "06.03 Admin List Stories Queue (FR-12)");

    const adminApproveStoryRes = await request(port, "PUT", `/api/admin/stories/${newStoryId}/approve`, { Authorization: `Bearer ${adminToken}` });
    assert(adminApproveStoryRes.status === 200 && adminApproveStoryRes.body.data.story.status === "APPROVED", "06.04 Admin Approve Story (FR-12)");

    // 07. RESOURCES MODULE
    console.log("\n📁 Module 07: Resources (FR-13, FR-14)");
    const listResourcesRes = await request(port, "GET", "/api/resources?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(listResourcesRes.status === 200 && listResourcesRes.body.data.items.length > 0, "07.01 List Resources (FR-13)");
    resourceId = listResourcesRes.body.data.items[0].id;

    const downloadRes = await request(port, "POST", `/api/resources/${resourceId}/download`, { Authorization: `Bearer ${studentToken}` });
    assert(downloadRes.status === 200 && downloadRes.body.data.downloadCount > 0, "07.02 Download Resource - Increment Counter (FR-13)");

    // 08. BOOKMARKS MODULE
    console.log("\n📁 Module 08: Bookmarks (FR-15, FR-16, FR-17)");
    const createBookmarkRes = await request(port, "POST", "/api/bookmarks", { Authorization: `Bearer ${studentToken}` }, {
      itemType: "CAREER",
      itemId: careerId,
    });
    // Can be 201 or 409 if already exists
    assert(createBookmarkRes.status === 201 || createBookmarkRes.status === 409, "08.01 Create Career Bookmark (FR-15)");

    const listBookmarksRes = await request(port, "GET", "/api/bookmarks?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(listBookmarksRes.status === 200 && listBookmarksRes.body.data.items.length > 0, "08.02 List User Bookmarks (FR-15)");
    const bookmarkId = listBookmarksRes.body.data.items[0].id;

    const addNoteRes = await request(port, "POST", `/api/bookmarks/${bookmarkId}/notes`, { Authorization: `Bearer ${studentToken}` }, {
      noteText: "High priority target for job applications next quarter.",
    });
    assert(addNoteRes.status === 201 && addNoteRes.body.data.note, "08.03 Add Note to Bookmark (FR-15)");

    const shareLinkRes = await request(port, "GET", "/api/bookmarks/share", { Authorization: `Bearer ${studentToken}` });
    assert(shareLinkRes.status === 200 && shareLinkRes.body.data.shareToken, "08.04 Generate Share Link (FR-16)");
    shareToken = shareLinkRes.body.data.shareToken;

    const viewSharedRes = await request(port, "GET", `/api/bookmarks/shared/${shareToken}`);
    assert(viewSharedRes.status === 200 && viewSharedRes.body.data.readOnly === true, "08.05 View Public Shared Bookmarks (FR-16)");

    const exportBookmarksRes = await request(port, "GET", "/api/bookmarks/export", { Authorization: `Bearer ${studentToken}` });
    assert(exportBookmarksRes.status === 200 && exportBookmarksRes.headers["content-type"].includes("application/json"), "08.06 Export Bookmarks JSON (FR-17)");

    // 09. FEEDBACK MODULE
    console.log("\n📁 Module 09: Feedback (FR-18, FR-19)");
    const submitFeedbackRes = await request(port, "POST", "/api/feedback", { Authorization: `Bearer ${studentToken}` }, {
      type: "SUGGESTION",
      message: "Please add salary comparison tools across different geographic regions.",
    });
    assert(submitFeedbackRes.status === 201 && submitFeedbackRes.body.data.feedback, "09.01 Submit User Feedback (FR-18)");
    const feedbackId = submitFeedbackRes.body.data.feedback.id;

    const myFeedbackRes = await request(port, "GET", "/api/feedback/mine?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    const userFeedbacks = myFeedbackRes.body.data.feedbacks || myFeedbackRes.body.data.items || [];
    assert(myFeedbackRes.status === 200 && userFeedbacks.length > 0, "09.02 List My Feedback Tickets (FR-18)");

    const adminListFeedbackRes = await request(port, "GET", "/api/admin/feedback?page=1&limit=10", { Authorization: `Bearer ${adminToken}` });
    assert(adminListFeedbackRes.status === 200 && adminListFeedbackRes.body.data.items.length > 0, "09.03 Admin List All Feedbacks (FR-19)");

    const adminRespondFeedbackRes = await request(port, "PUT", `/api/admin/feedback/${feedbackId}/respond`, { Authorization: `Bearer ${adminToken}` }, {
      response: "Great suggestion! Multi-regional salary indexing will be included in the v2 roadmap.",
    });
    assert(adminRespondFeedbackRes.status === 200 && adminRespondFeedbackRes.body.data.feedback.adminResponse, "09.04 Admin Respond to Feedback (FR-19)");

    // 10. NOTIFICATIONS MODULE
    console.log("\n📁 Module 10: Notifications (FR-20)");
    const getNotificationsRes = await request(port, "GET", "/api/notifications?page=1&limit=10", { Authorization: `Bearer ${studentToken}` });
    assert(getNotificationsRes.status === 200 && getNotificationsRes.body.data.items.length > 0, "10.01 Get Notifications (FR-20)");

    const getUnreadCountRes = await request(port, "GET", "/api/notifications/unread-count", { Authorization: `Bearer ${studentToken}` });
    assert(getUnreadCountRes.status === 200 && typeof (getUnreadCountRes.body.data.count ?? getUnreadCountRes.body.data.unreadCount) === "number", "10.02 Get Unread Count (FR-20)");

    const markAllReadRes = await request(port, "PUT", "/api/notifications/read-all", { Authorization: `Bearer ${studentToken}` });
    assert(markAllReadRes.status === 200 && markAllReadRes.body.success === true, "10.03 Mark All Read (FR-20)");

    const adminBroadcastRes = await request(port, "POST", "/api/admin/notifications/announce", { Authorization: `Bearer ${adminToken}` }, {
      title: "Global System Maintenance Notice",
      message: "Scheduled maintenance completed successfully with zero downtime.",
    });
    assert(adminBroadcastRes.status === 201 && adminBroadcastRes.body.data.recipientCount > 0, "10.04 Admin Broadcast Announcement (FR-20)");

    // 11. ADMIN MODULE
    console.log("\n📁 Module 11: Admin Overview & Stats (FR-21)");
    const adminOverviewRes = await request(port, "GET", "/api/admin/stats/overview", { Authorization: `Bearer ${adminToken}` });
    assert(adminOverviewRes.status === 200 && adminOverviewRes.body.data.activeUsersByRole, "11.01 Get Admin Overview Stats (FR-21)");

    const healthRes = await request(port, "GET", "/api/health");
    assert(healthRes.status === 200 && healthRes.body.success === true, "11.02 Get System Health (FR-21)");

  } finally {
    server.close();
  }

  console.log("\n==========================================================");
  console.log(`POSTMAN / AUTOMATED SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPostmanQA().catch((err) => {
  console.error("QA runner error:", err);
  process.exit(1);
});
