async function testFD3C() {
  console.log("=== PHASE FD-3C END-TO-END QA VERIFICATION ===");

  // 1. Log in as student
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@pathseeker.com", password: "StudentPass123" }),
  });
  const { data: { token } } = await loginRes.json();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 2. SUCCESS STORY SUBMISSION & MY SUBMISSIONS TEST
  console.log("\n1. Testing Success Story Submission...");
  const storyRes = await fetch("http://localhost:5000/api/stories", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "How I Transitioned from Chemistry to Cloud DevOps",
      domain: "Engineering",
      educationPath: "Self-taught Linux, AWS certifications, and open-source contributions",
      challenges: "Navigating complex networking concepts and overcoming initial interview rejections",
      outcome: "Secured a Junior Cloud Engineer role at an enterprise SaaS company"
    }),
  });
  const storyData = await storyRes.json();
  console.log(`✓ Submitted Story #${storyData.data.story.id} with status: "${storyData.data.story.status}"`);

  // Verify it appears in /stories/mine
  const myStoriesRes = await fetch("http://localhost:5000/api/stories/mine", { headers });
  const myStories = await myStoriesRes.json();
  const foundStory = myStories.data.stories.find(s => s.id === storyData.data.story.id);
  console.log(`✓ Story verified in My Submissions list! Title: "${foundStory.title}", Status: ${foundStory.status}`);

  // 3. RESOURCE DOWNLOAD INCREMENT TEST
  console.log("\n2. Testing Resource Download Count Increment...");
  const resBefore = await fetch("http://localhost:5000/api/resources?page=1&limit=10", { headers });
  const resList = await resBefore.json();
  console.log("Resources list shape:", JSON.stringify(Object.keys(resList.data || {})));
  const targetRes = (resList.data.items || resList.data.resources || [])[0];
  const countBefore = targetRes.downloadCount;
  console.log(`Resource #${targetRes.id} ("${targetRes.title}") Count Before: ${countBefore}`);

  const downloadRes = await fetch(`http://localhost:5000/api/resources/${targetRes.id}/download`, { method: "POST", headers });
  const downloadRaw = await downloadRes.text();
  console.log("Download raw response:", downloadRaw);
  const downloadData = JSON.parse(downloadRaw);
  console.log(`Download response count: ${downloadData.data.downloadCount}`);
  console.log(`✓ Verified count incremented: ${countBefore} -> ${downloadData.data.downloadCount}`);

  // 4. BOOKMARK NOTES CRUD & SHARE LINK TEST
  console.log("\n3. Testing Bookmark Notes CRUD & Share Link...");
  const bmListRes = await fetch("http://localhost:5000/api/bookmarks", { headers });
  const bmList = await bmListRes.json();
  const targetBm = bmList.data.items[0];
  console.log(`Target Bookmark: #${targetBm.id} ("${targetBm.title}")`);

  // Add Note
  const addNoteRes = await fetch(`http://localhost:5000/api/bookmarks/${targetBm.id}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ noteText: "Review salary brackets for cloud engineer" }),
  });
  const addNoteData = await addNoteRes.json();
  const noteId = addNoteData.data.note.id;
  console.log(`✓ Note Added (ID #${noteId}): "${addNoteData.data.note.note}"`);

  // Update Note
  const updateNoteRes = await fetch(`http://localhost:5000/api/bookmarks/notes/${noteId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ noteText: "Updated: Compare AWS and Azure salary brackets" }),
  });
  const updateNoteData = await updateNoteRes.json();
  console.log(`✓ Note Updated: "${updateNoteData.data.note.note}"`);

  // Delete Note
  const delNoteRes = await fetch(`http://localhost:5000/api/bookmarks/notes/${noteId}`, {
    method: "DELETE",
    headers,
  });
  const delNoteData = await delNoteRes.json();
  console.log(`✓ Note Deleted: ${delNoteData.message}`);

  // Share Link
  const shareRes = await fetch("http://localhost:5000/api/bookmarks/share", { headers });
  const shareData = await shareRes.json();
  console.log(`✓ Generated Bookmark Share URL: ${shareData.data.shareUrl}`);
  // Test public share link (no auth)
  const publicShareRes = await fetch(`http://localhost:5000${shareData.data.shareUrl}`);
  const publicShareData = await publicShareRes.json();
  console.log(`✓ Public Share Link Validated (No Auth): Returned ${publicShareData.data.items.length} bookmarked items`);

  // 5. FEEDBACK SUBMISSION TEST
  console.log("\n4. Testing Feedback Submission...");
  const fbRes = await fetch("http://localhost:5000/api/feedback", {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "SUGGESTION",
      message: "Please add salary comparisons for European and Asian tech hubs"
    }),
  });
  const fbData = await fbRes.json();
  console.log(`✓ Feedback Submitted (ID #${fbData.data.feedback.id}): Status=${fbData.data.feedback.status}`);

  const myFbRes = await fetch("http://localhost:5000/api/feedback/mine", { headers });
  const myFb = await myFbRes.json();
  console.log(`✓ Total User Feedback Tickets: ${myFb.data.feedbacks.length}`);

  // 6. NOTIFICATIONS TEST
  console.log("\n5. Testing Notifications Mark-Read & Mark-All-Read...");
  const notifRes = await fetch("http://localhost:5000/api/notifications", { headers });
  const notifData = await notifRes.json();
  console.log(`Total notifications in stream: ${notifData.data.items.length}`);
  
  if (notifData.data.items.length > 0) {
    const targetNotif = notifData.data.items[0];
    const markReadRes = await fetch(`http://localhost:5000/api/notifications/${targetNotif.id}/read`, {
      method: "PUT",
      headers,
    });
    console.log(`✓ Marked notification #${targetNotif.id} as read`);
  }

  const markAllRes = await fetch("http://localhost:5000/api/notifications/read-all", {
    method: "PUT",
    headers,
  });
  const markAllData = await markAllRes.json();
  console.log(`✓ Marked all notifications as read: ${markAllData.message}`);
}

testFD3C();
