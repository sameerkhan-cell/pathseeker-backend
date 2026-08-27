const { prisma } = require("../../config/db");

function serialize(career) {
  const { requiredSkills, ...rest } = career;
  return {
    ...rest,
    skills: requiredSkills ? JSON.parse(requiredSkills) : [],
    relatedCareers: career.relatedCareers ? JSON.parse(career.relatedCareers) : [],
    tags: career.tags ? JSON.parse(career.tags) : [],
  };
}

function toDbShape(data) {
  const db = { ...data };
  if (data.demand !== undefined) db.demandLevel = data.demand;
  delete db.demand;
  if (data.skills !== undefined) db.requiredSkills = JSON.stringify(data.skills);
  delete db.skills;
  for (const key of ["relatedCareers", "tags"]) {
    if (data[key] !== undefined) db[key] = JSON.stringify(data[key]);
  }
  return db;
}

async function listCareers(query, { includeInactive = false } = {}) {
  const where = {};

  if (!includeInactive) where.isActive = true;
  if (query.domain) where.domain = { contains: query.domain };
  if (query.skill) where.requiredSkills = { contains: query.skill }; // LIKE on JSON text
  if (query.demand) where.demandLevel = query.demand;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }
  // Salary range intersection with [minSalary, maxSalary]
  const salaryWhere = {};
  if (query.minSalary !== undefined) salaryWhere.salaryMax = { gte: query.minSalary };
  if (query.maxSalary !== undefined) {
    salaryWhere.salaryMin = { ...(salaryWhere.salaryMin || {}), lte: query.maxSalary };
  }
  if (Object.keys(salaryWhere).length) Object.assign(where, salaryWhere);

  const [items, total] = await Promise.all([
    prisma.career.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.career.count({ where }),
  ]);

  return {
    items: items.map(serialize),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

async function getCareerById(id, userId, { includeInactive = false } = {}) {
  const career = await prisma.career.findFirst({
    where: includeInactive ? { id } : { id, isActive: true },
  });
  if (!career) return null;

  // Track recently viewed. Manual find->update/create because nullable columns
  // in the @@unique make Prisma upsert unreliable on MySQL.
  const existing = await prisma.recentlyViewed.findFirst({
    where: { userId, itemType: "CAREER", careerId: id },
  });
  if (existing) {
    await prisma.recentlyViewed.update({ where: { id: existing.id }, data: { viewedAt: new Date() } });
  } else {
    await prisma.recentlyViewed.create({ data: { userId, itemType: "CAREER", careerId: id } });
  }

  return serialize(career);
}

/**
 * Public trending careers — no auth required.
 * Rule: TOP_6 active careers, sorted by demandLevel (HIGH > MEDIUM > LOW)
 * then by createdAt desc (most recently added). Returns only fields
 * needed for a public card display — no tracking side-effects.
 */
async function getTrendingCareers() {
  const demandOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    take: 50, // fetch more so we can sort in-process
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      domain: true,
      salaryMin: true,
      salaryMax: true,
      demandLevel: true,
      tags: true,
    },
  });

  // Sort by demand (HIGH first) then take top 6
  const sorted = careers
    .sort((a, b) => {
      const diff = (demandOrder[a.demandLevel] ?? 3) - (demandOrder[b.demandLevel] ?? 3);
      return diff !== 0 ? diff : 0; // already createdAt desc from DB
    })
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      title: c.title,
      domain: c.domain,
      salaryMin: c.salaryMin,
      salaryMax: c.salaryMax,
      demand: c.demandLevel,
      tags: c.tags ? JSON.parse(c.tags) : [],
    }));

  return sorted;
}

module.exports = { serialize, toDbShape, listCareers, getCareerById, getTrendingCareers };
