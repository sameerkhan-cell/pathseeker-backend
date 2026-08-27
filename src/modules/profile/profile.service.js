const { prisma } = require("../../config/db");

// skills/interests DB me JSON text store hote hain; API layer me arrays.
function serialize(profile) {
  if (!profile) return null;
  return {
    ...profile,
    skills: profile.skills ? JSON.parse(profile.skills) : [],
    interests: profile.interests ? JSON.parse(profile.interests) : [],
  };
}

function toDbShape(data) {
  const db = { ...data };
  if (data.skills !== undefined) db.skills = JSON.stringify(data.skills);
  if (data.interests !== undefined) db.interests = JSON.stringify(data.interests);
  Object.keys(db).forEach((k) => db[k] === undefined && delete db[k]);
  return db;
}

async function getOrCreateProfile(userId) {
  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.profile.create({ data: { userId } });
  }
  return serialize(profile);
}

async function updateProfile(userId, data) {
  await getOrCreateProfile(userId); // ensure row exists
  const updated = await prisma.profile.update({
    where: { userId }, // derived from JWT - never client-supplied
    data: toDbShape(data),
  });
  return serialize(updated);
}

async function setResumeUrl(userId, fileUrl) {
  await getOrCreateProfile(userId);
  return prisma.profile.update({ where: { userId }, data: { resumeUrl: fileUrl } });
}

async function getRawProfile(userId) {
  return prisma.profile.findUnique({ where: { userId } });
}

module.exports = { serialize, getOrCreateProfile, updateProfile, setResumeUrl, getRawProfile };
