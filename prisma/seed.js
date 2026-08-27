const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. CLEANUP (Idempotency: safely wipe dependent tables in correct dependency order)
  console.log("🧹 Clearing previous records for clean idempotent seeding...");
  await prisma.bookmarkNote.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.recentlyViewed.deleteMany();
  await prisma.mediaRating.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.successStory.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.savedFilter.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.career.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();

  // 2. SEED USERS & PROFILES
  console.log("👤 Creating user accounts across all 4 roles...");
  const adminHash = await bcrypt.hash("AdminPass123", 10);
  const studentHash = await bcrypt.hash("StudentPass123", 10);
  const graduateHash = await bcrypt.hash("GraduatePass123", 10);
  const proHash = await bcrypt.hash("ProPass123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@pathseeker.com",
      passwordHash: adminHash,
      role: "ADMIN",
      isEmailVerified: true,
      profile: {
        create: {
          bio: "PathSeeker Platform Administrator & Career Operations Manager",
          currentRole: "Platform Admin",
          institution: "PathSeeker HQ",
        },
      },
    },
  });

  const student = await prisma.user.create({
    data: {
      name: "Ali Raza (Student)",
      email: "student@pathseeker.com",
      passwordHash: studentHash,
      role: "STUDENT",
      isEmailVerified: true,
      profile: {
        create: {
          phone: "+1-555-0101",
          bio: "Final year Computer Science student passionate about web and AI technologies.",
          educationLevel: "Undergraduate",
          fieldOfStudy: "Computer Science",
          institution: "National University of Sciences & Technology",
          graduationYear: 2026,
          skills: JSON.stringify(["JavaScript", "React", "Node.js", "Python", "SQL"]),
          interests: JSON.stringify(["Web Development", "Cloud Computing", "AI"]),
          experienceYears: 1,
          currentRole: "Student Developer",
        },
      },
    },
  });

  const graduate = await prisma.user.create({
    data: {
      name: "Sarah Jenkins (Graduate)",
      email: "graduate@pathseeker.com",
      passwordHash: graduateHash,
      role: "GRADUATE",
      isEmailVerified: true,
      profile: {
        create: {
          phone: "+1-555-0102",
          bio: "Recent CS graduate actively interviewing for Junior Full-Stack and Backend positions.",
          educationLevel: "Bachelor of Science",
          fieldOfStudy: "Software Engineering",
          institution: "Tech Institute of Technology",
          graduationYear: 2025,
          skills: JSON.stringify(["TypeScript", "React", "PostgreSQL", "Express", "Docker"]),
          interests: JSON.stringify(["Distributed Systems", "UI Design", "DevOps"]),
          experienceYears: 2,
          currentRole: "Associate Software Engineer",
        },
      },
    },
  });

  const professional = await prisma.user.create({
    data: {
      name: "Tariq Mahmood (Professional)",
      email: "pro@pathseeker.com",
      passwordHash: proHash,
      role: "PROFESSIONAL",
      isEmailVerified: true,
      profile: {
        create: {
          phone: "+1-555-0103",
          bio: "Senior Cloud Architect with 8+ years experience architecting cloud-native solutions.",
          educationLevel: "Master of Science",
          fieldOfStudy: "Computer Engineering",
          institution: "Stanford University",
          graduationYear: 2018,
          skills: JSON.stringify(["AWS", "GCP", "Kubernetes", "Terraform", "System Design", "Go"]),
          interests: JSON.stringify(["Cloud Architecture", "Platform Engineering", "Mentorship"]),
          experienceYears: 8,
          currentRole: "Principal Cloud Architect",
        },
      },
    },
  });

  // 3. SEED CAREERS (10 careers across 5 distinct domains)
  console.log("💼 Creating 10 diverse careers across 5 domains...");
  const careersData = [
    {
      title: "Full Stack Software Engineer",
      domain: "Engineering",
      description: "Designs, builds, and maintains web applications spanning front-end UI and backend scalable APIs.",
      requiredSkills: JSON.stringify(["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git"]),
      educationPath: "Bachelor's degree in Computer Science, Software Engineering, or equivalent practical coding bootcamp experience.",
      salaryMin: 70000,
      salaryMax: 135000,
      demandLevel: "HIGH",
      growthOutlook: "Projected 25% growth over the next decade with immense industry demand.",
      relatedCareers: JSON.stringify(["Frontend Engineer", "Backend Engineer", "DevOps Engineer"]),
      tags: JSON.stringify(["web", "react", "node", "javascript", "cloud"]),
    },
    {
      title: "Cloud Solutions Architect",
      domain: "Engineering",
      description: "Architects highly resilient, fault-tolerant, and secure enterprise infrastructures on AWS, GCP, and Azure.",
      requiredSkills: JSON.stringify(["AWS", "Kubernetes", "Terraform", "Docker", "Linux", "Networking"]),
      educationPath: "Degree in Computer Science/IT + Cloud Professional Certifications (AWS Solutions Architect / GCP PCA).",
      salaryMin: 110000,
      salaryMax: 185000,
      demandLevel: "HIGH",
      growthOutlook: "Rapid expansion as enterprise organizations migrate core infrastructure to cloud environments.",
      relatedCareers: JSON.stringify(["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer"]),
      tags: JSON.stringify(["cloud", "aws", "devops", "infrastructure", "docker"]),
    },
    {
      title: "Embedded Systems Engineer",
      domain: "Engineering",
      description: "Develops low-level firmware and embedded software for IoT devices, automotive systems, and microcontrollers.",
      requiredSkills: JSON.stringify(["C", "C++", "RTOS", "Microcontrollers", "PCB Design", "ARM"]),
      educationPath: "Bachelor's degree in Electrical Engineering, Computer Engineering, or Embedded Systems.",
      salaryMin: 65000,
      salaryMax: 120000,
      demandLevel: "MEDIUM",
      growthOutlook: "Steady demand driven by automotive electrification, robotics, and smart home IoT devices.",
      relatedCareers: JSON.stringify(["Firmware Engineer", "Robotics Engineer", "Hardware Engineer"]),
      tags: JSON.stringify(["hardware", "c++", "iot", "robotics", "embedded"]),
    },
    {
      title: "Data Scientist & Machine Learning Engineer",
      domain: "Data",
      description: "Builds predictive statistical models, deep neural networks, and scalable AI inference pipelines.",
      requiredSkills: JSON.stringify(["Python", "PyTorch", "TensorFlow", "SQL", "Pandas", "Scikit-Learn"]),
      educationPath: "Bachelor's or Master's in Data Science, Statistics, Mathematics, or Computer Science.",
      salaryMin: 85000,
      salaryMax: 155000,
      demandLevel: "HIGH",
      growthOutlook: "Exponential surge fueled by generative AI, LLMs, and enterprise automation.",
      relatedCareers: JSON.stringify(["Data Analyst", "Data Engineer", "AI Researcher"]),
      tags: JSON.stringify(["ai", "ml", "python", "datascience", "deeplearning"]),
    },
    {
      title: "Business Intelligence & Data Analyst",
      domain: "Data",
      description: "Transforms complex structured datasets into intuitive executive dashboards and actionable business insights.",
      requiredSkills: JSON.stringify(["SQL", "PowerBI", "Tableau", "Excel", "Python", "Data Storytelling"]),
      educationPath: "Degree in Business Analytics, Economics, Statistics, or Information Systems.",
      salaryMin: 55000,
      salaryMax: 95000,
      demandLevel: "MEDIUM",
      growthOutlook: "Consistent demand across financial services, e-commerce, and healthcare sectors.",
      relatedCareers: JSON.stringify(["Data Scientist", "Marketing Analyst", "Financial Analyst"]),
      tags: JSON.stringify(["analytics", "sql", "powerbi", "tableau", "insights"]),
    },
    {
      title: "UI/UX Product Designer",
      domain: "Design",
      description: "Conducts user research, creates high-fidelity wireframes, interactive prototypes, and design systems.",
      requiredSkills: JSON.stringify(["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems", "Usability Testing"]),
      educationPath: "Degree in Human-Computer Interaction (HCI), Graphic Design, or UX Bootcamp portfolio.",
      salaryMin: 60000,
      salaryMax: 115000,
      demandLevel: "HIGH",
      growthOutlook: "Strong growth as tech products prioritize seamless user-centric experiences.",
      relatedCareers: JSON.stringify(["Product Designer", "Visual Designer", "UX Researcher"]),
      tags: JSON.stringify(["design", "figma", "ux", "ui", "prototyping"]),
    },
    {
      title: "3D Motion Graphics Artist",
      domain: "Design",
      description: "Creates immersive 3D animation, visual effects, and dynamic motion assets for media and digital products.",
      requiredSkills: JSON.stringify(["Blender", "After Effects", "Cinema 4D", "Maya", "Typography", "Storyboarding"]),
      educationPath: "Degree in Digital Media, Animation, Fine Arts, or demonstrable creative showreel.",
      salaryMin: 50000,
      salaryMax: 95000,
      demandLevel: "MEDIUM",
      growthOutlook: "Steady demand in gaming, advertising, AR/VR experiences, and streaming media.",
      relatedCareers: JSON.stringify(["Game Designer", "VFX Artist", "Illustrator"]),
      tags: JSON.stringify(["animation", "3d", "blender", "vfx", "motion"]),
    },
    {
      title: "Technical Product Manager",
      domain: "Business",
      description: "Defines product roadmaps, aligns engineering with commercial goals, and leads cross-functional agile teams.",
      requiredSkills: JSON.stringify(["Agile/Scrum", "Product Strategy", "Roadmapping", "Jira", "User Stories", "Market Analysis"]),
      educationPath: "Degree in Business, Computer Science, or Engineering + Technical Product Management track.",
      salaryMin: 90000,
      salaryMax: 160000,
      demandLevel: "HIGH",
      growthOutlook: "High demand across startups and tech giants seeking product leadership.",
      relatedCareers: JSON.stringify(["Project Manager", "Scrum Master", "Engineering Manager"]),
      tags: JSON.stringify(["product", "agile", "strategy", "management", "leadership"]),
    },
    {
      title: "Digital Growth & SEO Strategist",
      domain: "Business",
      description: "Drives organic acquisition, search engine optimization, content strategy, and conversion rate optimization.",
      requiredSkills: JSON.stringify(["SEO", "Google Analytics", "Content Strategy", "CRO", "SEM", "A/B Testing"]),
      educationPath: "Degree in Marketing, Communications, Business Administration, or Google Analytics certifications.",
      salaryMin: 45000,
      salaryMax: 80000,
      demandLevel: "LOW",
      growthOutlook: "Specialized opportunities focusing on technical SEO and algorithmic search updates.",
      relatedCareers: JSON.stringify(["Content Strategist", "Marketing Manager", "Social Media Strategist"]),
      tags: JSON.stringify(["marketing", "seo", "analytics", "growth", "business"]),
    },
    {
      title: "Healthcare Informatics Specialist",
      domain: "Healthcare",
      description: "Integrates health information systems, electronic medical records (EMR), and healthcare data standards.",
      requiredSkills: JSON.stringify(["HL7/FHIR", "EMR Systems", "Health Data Standards", "SQL", "Compliance/HIPAA"]),
      educationPath: "Degree in Health Informatics, Nursing Informatics, Healthcare Administration, or Computer Science.",
      salaryMin: 65000,
      salaryMax: 110000,
      demandLevel: "HIGH",
      growthOutlook: "Surging demand fueled by digital healthcare modernization and telemedicine adoption.",
      relatedCareers: JSON.stringify(["Clinical Data Analyst", "Health IT Consultant", "Biomedical Engineer"]),
      tags: JSON.stringify(["healthcare", "healthtech", "informatics", "data", "ehr"]),
    },
  ];

  const createdCareers = [];
  for (const c of careersData) {
    const career = await prisma.career.create({ data: c });
    createdCareers.push(career);
  }

  // 4. SEED SAVED FILTERS
  console.log("🔍 Creating saved filter for student user...");
  await prisma.savedFilter.create({
    data: {
      userId: student.id,
      name: "High Demand Tech Careers",
      filterJson: JSON.stringify({ domain: "Engineering", demand: "HIGH", minSalary: 70000 }),
    },
  });

  // 5. SEED QUIZ (Comprehensive Career Aptitude Quiz with MC, LIKERT, SLIDER)
  console.log("📝 Creating published Quiz with Multiple-Choice, Likert, and Slider questions...");
  const quiz = await prisma.quiz.create({
    data: {
      title: "Comprehensive Career Aptitude & Tech Readiness Assessment",
      description: "Evaluate your technical aptitudes, problem-solving preferences, and domain inclinations to discover ideal career tracks.",
      category: "Technology & Engineering",
      durationMinutes: 15,
      status: "PUBLISHED",
      questions: {
        create: [
          {
            type: "MULTIPLE_CHOICE",
            questionText: "Which type of problem-solving activity gives you the highest satisfaction?",
            order: 1,
            options: JSON.stringify([
              { id: "opt_eng", text: "Architecting software systems, writing algorithms, and debugging complex backend logic", weight: 25 },
              { id: "opt_data", text: "Analyzing raw datasets, finding statistical correlations, and training predictive AI models", weight: 20 },
              { id: "opt_design", text: "Crafting beautiful, intuitive visual interfaces and improving user experience workflows", weight: 15 },
              { id: "opt_biz", text: "Leading teams, establishing product vision, and aligning technology with market strategy", weight: 10 },
            ]),
          },
          {
            type: "LIKERT",
            questionText: "I thrive when working with structured technical systems, automated infrastructure, and cloud pipelines.",
            order: 2,
            options: JSON.stringify([
              { id: "likert_1", text: "Strongly Disagree", weight: 5 },
              { id: "likert_2", text: "Disagree", weight: 10 },
              { id: "likert_3", text: "Neutral", weight: 15 },
              { id: "likert_4", text: "Agree", weight: 20 },
              { id: "likert_5", text: "Strongly Agree", weight: 25 },
            ]),
          },
          {
            type: "SLIDER",
            questionText: "Rate your enthusiasm for continuous learning and adapting to fast-evolving developer toolchains (0-100):",
            order: 3,
            options: JSON.stringify([]),
            sliderMin: 0,
            sliderMax: 100,
            sliderStep: 5,
          },
        ],
      },
    },
  });

  // 6. SEED MULTIMEDIA (Video, Podcast, Animated Explainer + Rating)
  console.log("🎥 Creating multimedia resources across Video, Podcast, and Explainer...");
  const media1 = await prisma.media.create({
    data: {
      title: "A Day in the Life of a Cloud Solutions Architect",
      type: "VIDEO",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
      category: "Engineering",
      transcript: "In this session, we walk through enterprise cloud design patterns, Terraform automation, and high availability architectures.",
      tags: JSON.stringify(["cloud", "architecture", "aws", "day-in-life"]),
      status: "PUBLISHED",
    },
  });

  const media2 = await prisma.media.create({
    data: {
      title: "Navigating the Product Design Career Ladder: From Junior to Lead",
      type: "PODCAST",
      url: "https://soundcloud.com/example/product-design-pathways",
      thumbnailUrl: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800",
      category: "Design",
      transcript: "A conversation with leading Design Directors about portfolio presentation, design systems, and stakeholder communication.",
      tags: JSON.stringify(["design", "ux", "podcast", "career-growth"]),
      status: "PUBLISHED",
    },
  });

  const media3 = await prisma.media.create({
    data: {
      title: "Demystifying Neural Networks & Large Language Models",
      type: "ANIMATED_EXPLAINER",
      url: "https://www.youtube.com/watch?v=aircAruvnKk",
      thumbnailUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800",
      category: "Data",
      transcript: "Visual animation breaking down attention mechanisms, gradient descent, and deep learning neural architectures.",
      tags: JSON.stringify(["ai", "ml", "neural-networks", "animation"]),
      status: "PUBLISHED",
    },
  });

  // Add initial ratings to media
  await prisma.mediaRating.create({
    data: {
      mediaId: media1.id,
      userId: graduate.id,
      rating: 5,
      comment: "Incredible real-world overview of what enterprise cloud architecture entails!",
    },
  });

  // 7. SEED SUCCESS STORIES (1 Approved, 1 Pending for Moderation Queue)
  console.log("🌟 Creating Success Stories (1 Approved, 1 Pending)...");
  await prisma.successStory.create({
    data: {
      userId: graduate.id,
      title: "From Non-Traditional Background to Full Stack Engineer in 18 Months",
      domain: "Engineering",
      educationPath: "Self-paced coding curriculum supplemented with University Computer Science coursework.",
      challenges: "Overcoming imposter syndrome, balancing coursework with portfolio project building, and tackling technical whiteboard interviews.",
      outcome: "Successfully landed a Full Stack Engineer position at a top-tier fintech scaleup with competitive compensation.",
      status: "APPROVED",
      reviewedAt: new Date(),
    },
  });

  await prisma.successStory.create({
    data: {
      userId: student.id,
      title: "Transitioning from Pure Mathematics into Predictive Data Science",
      domain: "Data",
      educationPath: "BS Mathematics with an emphasis on Applied Probability and Machine Learning specializations.",
      challenges: "Bridging the gap between abstract theoretical math and practical Python software engineering practices.",
      outcome: "Secured a Machine Learning Engineering internship with hands-on computer vision modeling.",
      status: "PENDING",
    },
  });

  // 8. SEED RESOURCES (PDF, Checklist, Infographic)
  console.log("📚 Creating Resource Library items...");
  await prisma.resource.create({
    data: {
      title: "Full-Stack Web Development 2026 Roadmap & Skill Guide",
      description: "A comprehensive guide covering modern frontend frameworks, backend API architectures, containerization, and cloud deployment.",
      type: "PDF",
      audience: "Undergraduate Students & Career Switchers",
      tags: JSON.stringify(["roadmap", "fullstack", "webdev", "careers"]),
      fileUrl: "/uploads/resources/fullstack-roadmap-2026.pdf",
      previewUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
      downloadCount: 48,
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      title: "Technical Resume & Software Portfolio Readiness Checklist",
      description: "A 25-point actionable checklist to optimize your software developer resume for ATS scanners and technical recruiters.",
      type: "CHECKLIST",
      audience: "Graduates & Job Seekers",
      tags: JSON.stringify(["resume", "interview", "checklist", "jobs"]),
      fileUrl: "/uploads/resources/resume-readiness-checklist.pdf",
      previewUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
      downloadCount: 82,
      isActive: true,
    },
  });

  await prisma.resource.create({
    data: {
      title: "Data Science vs Data Engineering Skill Comparison Matrix",
      description: "Visual breakdown distinguishing data warehousing, ETL pipelines, machine learning, and business analytics competencies.",
      type: "INFOGRAPHIC",
      audience: "Data Professionals & Aspiring Analysts",
      tags: JSON.stringify(["datascience", "dataengineering", "infographic", "skills"]),
      fileUrl: "/uploads/resources/data-skills-matrix.png",
      previewUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
      downloadCount: 29,
      isActive: true,
    },
  });

  // 9. SEED BOOKMARKS & NOTES
  console.log("🔖 Creating user bookmark and private note...");
  const bookmarkedCareer = await prisma.bookmark.create({
    data: {
      userId: student.id,
      itemType: "CAREER",
      careerId: createdCareers[0].id,
      notes: {
        create: {
          note: "Focus on deepening TypeScript and Docker skills before applying for internships this summer.",
        },
      },
    },
  });

  // 10. SEED FEEDBACK TICKETS
  console.log("💬 Creating feedback tickets...");
  await prisma.feedback.create({
    data: {
      userId: student.id,
      type: "SUGGESTION",
      subject: "Interactive Roadmap Feature Request",
      message: "Would love to have an interactive skill tree where completed skills unlock recommended job postings.",
      status: "OPEN",
    },
  });

  await prisma.feedback.create({
    data: {
      userId: graduate.id,
      type: "BUG",
      subject: "Dark Mode Contrast in Career Details",
      message: "Certain tag labels on the Career Detail page had low contrast when dark mode is enabled.",
      status: "RESOLVED",
      adminResponse: "Thank you for reporting! The badge contrast colors were updated in the latest release.",
      respondedAt: new Date(),
    },
  });

  // 11. SEED NOTIFICATIONS
  console.log("🔔 Creating in-app system notifications...");
  await prisma.notification.create({
    data: {
      userId: student.id,
      type: "BROADCAST",
      title: "Welcome to PathSeeker — Career Passport",
      message: "Take your personalized Career Aptitude assessment to unlock tailored career recommendations!",
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: graduate.id,
      type: "STATUS_UPDATE",
      title: "Your Success Story Has Been Approved!",
      message: "Congratulations! Your story 'From Non-Traditional Background to Full Stack Engineer' is now live in the Community Hall.",
      isRead: true,
    },
  });

  console.log("✅ Database seeding successfully completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
