# 🌟 PathSeeker — Career Passport Platform (Backend API)

> **PathSeeker Backend** is a Node.js + Express.js + Prisma ORM + MySQL REST API containing 11 core modules with role-based access control, JWT authentication, rate limiting, and public visitor support.

- **Frontend Repo**: [github.com/sameerkhan-cell/pathseeker-frontend](https://github.com/sameerkhan-cell/pathseeker-frontend)
- **Backend Repo**: [github.com/sameerkhan-cell/pathseeker-backend](https://github.com/sameerkhan-cell/pathseeker-backend)

---

## ⚡ Quick Setup Instructions

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
# DATABASE_URL="mysql://root:@127.0.0.1:3307/pathseeker"

# 3. Run Prisma migrations
npx prisma migrate dev --name init_schema

# 4. Seed database with demo data
npx prisma db seed

# 5. Start dev server
npm run dev
```

API runs at `http://localhost:5000/api`.

---

## 📋 System Assumptions

- Database: MySQL or MariaDB running on `127.0.0.1:3307`.
- Port: `5000` (`http://localhost:5000/api`).
- Auth: JWT bearer token header (`Authorization: Bearer <token>`).
- Public Endpoints: Supported via `optionalAuthMiddleware` (allows public discovery for careers, quizzes, media, stories, and resources).
