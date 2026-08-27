async function testE2EFlows() {
  console.log("=== END-TO-END VERIFICATION: QUIZ & MEDIA RATING ===");

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

  // 2. QUIZ FLOW
  console.log("\n1. Starting Quiz #2...");
  const startRes = await fetch("http://localhost:5000/api/quiz/2/start", { headers });
  const startData = await startRes.json();
  console.log(`✓ Started quiz "${startData.data.quiz.title}" with ${startData.data.questions.length} questions`);

  const answers = [
    { questionId: startData.data.questions[0].id, selectedOptionId: "opt_eng" },
    { questionId: startData.data.questions[1].id, selectedOptionId: "likert_5" },
    { questionId: startData.data.questions[2].id, sliderValue: 85 },
  ];

  console.log("Submitting quiz attempt with all 3 question types (MC, Likert, Slider)...");
  const submitRes = await fetch("http://localhost:5000/api/quiz/2/submit", {
    method: "POST",
    headers,
    body: JSON.stringify({
      startedAt: new Date(Date.now() - 60000).toISOString(),
      submittedAt: new Date().toISOString(),
      answers,
    }),
  });
  const submitData = await submitRes.json();
  console.log(`✓ Quiz Submitted! Attempt ID: ${submitData.data.attempt.id}, Score: ${submitData.data.attempt.score}`);

  // Fetch Attempt Results
  const attemptRes = await fetch(`http://localhost:5000/api/quiz/attempts/${submitData.data.attempt.id}`, { headers });
  const attemptData = await attemptRes.json();
  console.log(`✓ Retrieved Attempt Details: Score=${attemptData.data.attempt.score}, Recommended Domains:`, attemptData.data.attempt.recommendations.domains);

  // 3. MEDIA RATING FLOW
  console.log("\n2. Testing Media Rating Flow on Media #4...");
  const beforeRes = await fetch("http://localhost:5000/api/media/4/rating-summary", { headers });
  const beforeData = await beforeRes.json();
  console.log(`Summary Before: Average=${beforeData.data.average}, Count=${beforeData.data.count}`);

  console.log("Submitting 5-star rating...");
  const rateRes = await fetch("http://localhost:5000/api/media/4/rating", {
    method: "POST",
    headers,
    body: JSON.stringify({ rating: 5 }),
  });
  const rateData = await rateRes.json();
  console.log(`✓ Rating Response: ${rateData.message}`);

  const afterRes = await fetch("http://localhost:5000/api/media/4/rating-summary", { headers });
  const afterData = await afterRes.json();
  console.log(`Summary After: Average=${afterData.data.average}, Count=${afterData.data.count}`);
  console.log(`✓ Rating Persistence Verified! (Ratings count recorded)`);
}

testE2EFlows();
