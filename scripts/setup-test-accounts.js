// TEMP script — local browser test setup (delete after use).
// Marks test-employer@ishzone.uz as emailVerified and creates/updates
// test-seeker@ishzone.uz with a known bcrypt hash + a rich public profile
// so the "full seeker form" panel in the applicants dialog has content.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SEEKER_PASSWORD = 'TestPass123!';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('No MONGO_URI in env');
  await mongoose.connect(uri);
  const users = mongoose.connection.collection('users');

  // 1) Employer: flip emailVerified (login blocks when it is explicitly false).
  const emp = await users.findOne({ email: 'test-employer@ishzone.uz' });
  if (!emp) {
    console.log('WARN: test-employer@ishzone.uz not found');
  } else {
    await users.updateOne({ _id: emp._id }, { $set: { emailVerified: true } });
    console.log('employer verified:', emp._id.toString());
  }

  // 2) Seeker: create (or reset password + verify) — direct insert bypasses the
  //    per-IP registration guard entirely.
  const existing = await users.findOne({ email: 'test-seeker@ishzone.uz' });
  const hash = bcrypt.hashSync(SEEKER_PASSWORD, 12);
  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      { $set: { emailVerified: true, passwordHash: hash } },
    );
    console.log('seeker updated (verified + password reset):', existing._id.toString());
  } else {
    const res = await users.insertOne({
      name: 'Test Seeker',
      email: 'test-seeker@ishzone.uz',
      passwordHash: hash,
      role: 'seeker',
      username: 'testseeker',
      verificationLevels: { frontend: 'middle', backend: 'none', fullstack: 'none', mobile: 'none' },
      primaryDirection: 'frontend',
      bestPercentage: 74,
      bestScore: 15,
      attempts: 2,
      isQaTester: false,
      emailVerified: true,
      specialization: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
      about: '3 yillik tajribaga ega frontend dasturchi. Interfeys va performansga e\'tibor beraman.',
      socials: { github: 'https://github.com/testseeker', telegram: 'https://t.me/testseeker' },
      country: "O'zbekiston",
      language: "O'zbek, Rus",
      timezone: 'Asia/Tashkent',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('seeker created:', res.insertedId.toString());
  }

  const collections = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  console.log('collections:', collections.join(', '));

  await mongoose.disconnect();
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
