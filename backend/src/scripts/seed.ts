import crypto from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '@/config/db';
import { Question } from '@/models/Question';
import { User } from '@/models/User';
import { Job } from '@/models/Job';
import { seedQuestions } from '@/data/questions';
import { questionTranslations } from '@/data/questionTranslations';
import { logger } from '@/utils/logger';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/** Sample VACANCIES, seeded under a demo employer account. */
const sampleJobs = [
  {
    type: 'vacancy' as const,
    title: 'Frontend Developer (React)',
    company: 'TechCorp',
    description:
      'React va TypeScript bilan zamonaviy interfeyslar quramiz. Tajriba 1+ yil. Masofaviy ish imkoniyati bor.',
    level: 'junior' as const,
    stack: 'frontend' as const,
    salary: '$500 - $900',
    contactTelegram: '@techcorp_hr',
  },
  {
    type: 'vacancy' as const,
    title: 'Node.js Backend Engineer',
    company: 'FinFlow',
    description:
      'Express, MongoDB va mikroservislar bilan to‘lov tizimlari ustida ishlaysiz. REST va Socket.io tajribasi kerak.',
    level: 'middle' as const,
    stack: 'backend' as const,
    salary: '$1200 - $2000',
    contactPhone: '+998901234567',
  },
  {
    type: 'vacancy' as const,
    title: 'Senior Fullstack Developer',
    company: 'Ishbor',
    description:
      'Next.js + Node.js monorepo, arxitektura qarorlari, jamoa yetakchiligi. 4+ yil tajriba talab qilinadi.',
    level: 'senior' as const,
    stack: 'fullstack' as const,
    salary: '$2500+',
    contactTelegram: '@ishbor_jobs',
  },
];

/** Sample RESUMES, seeded under a demo verified seeker account. */
const sampleResumes = [
  {
    type: 'resume' as const,
    title: 'Junior Frontend Developer izlayapman',
    description:
      'React, TypeScript va Tailwind bilan pet-loyihalar qildim. Yangi jamoada o‘sishga tayyorman. Masofaviy yoki Toshkent.',
    level: 'junior' as const,
    stack: 'frontend' as const,
    salary: '$400 dan',
    contactTelegram: '@candidate_dev',
  },
  {
    type: 'resume' as const,
    title: 'Middle Backend (Node.js) — ish qidiryapman',
    description:
      'Express, MongoDB, REST API bilan 2 yil tajriba. Mikroservislar va CI/CD bilan tanishman.',
    level: 'middle' as const,
    stack: 'backend' as const,
    salary: '$1000 dan',
    contactPhone: '+998907654321',
  },
];

async function seed(): Promise<void> {
  await connectDatabase();

  await Question.deleteMany({});
  // Assign a stable per-technology key (`react-1`, `react-2`, …) and attach the
  // matching RU/UZ translations by that ordinal. English stays canonical.
  const perTechCounter: Record<string, number> = {};
  const inserted = await Question.insertMany(
    seedQuestions.map((q) => {
      const ordinal = perTechCounter[q.technology] ?? 0;
      perTechCounter[q.technology] = ordinal + 1;
      const key = `${q.technology}-${ordinal + 1}`;
      const localized = questionTranslations[q.technology]?.[ordinal];
      const translations = localized ? { ru: localized.ru, uz: localized.uz } : undefined;
      return {
        ...q,
        key,
        translations,
        // `category` mirrors `technology` (kept for backward compatibility).
        category: q.technology,
      };
    }),
  );
  logger.info(`Seeded ${inserted.length} questions (with RU/UZ translations).`);

  await Job.deleteMany({});

  // Demo EMPLOYER + vacancies.
  const employer = await User.findOneAndUpdate(
    { email: 'employer@ishbor.uz' },
    {
      $set: {
        name: 'Demo Employer',
        passwordHash: hashPassword('password123'),
        role: 'employer',
        verificationLevel: 'none',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Job.insertMany(
    sampleJobs.map((j) => ({ ...j, postedBy: employer!._id, postedByName: employer!.name })),
  );

  // Demo SEEKER (verified) + resumes.
  const seeker = await User.findOneAndUpdate(
    { email: 'seeker@ishbor.uz' },
    {
      $set: {
        name: 'Demo Candidate',
        passwordHash: hashPassword('password123'),
        role: 'seeker',
        verificationLevel: 'middle',
        bestPercentage: 92,
        bestScore: 18,
        attempts: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Job.insertMany(
    sampleResumes.map((r) => ({ ...r, postedBy: seeker!._id, postedByName: seeker!.name })),
  );

  logger.info(
    `Seeded ${sampleJobs.length} vacancies + ${sampleResumes.length} resumes ` +
      `(employer@ishbor.uz / seeker@ishbor.uz, parol: password123).`,
  );

  // QA/anti-cheat testing account (`User.isQaTester`) — a normal seeker in
  // every other respect, but `startTest` exempts it from the cooldown gate
  // and the one-in-progress-session guard, and it unlocks
  // `POST /test/auto-complete` (instant perfect-score finish). Lets whoever's
  // testing repeatedly restart mid-test and walk the full result flow
  // (ResultCard, badge award, ...) in uz/ru/en without real cooldowns.
  await User.findOneAndUpdate(
    { email: 'qa@ishbor.uz' },
    {
      $set: {
        name: 'QA Tester',
        passwordHash: hashPassword('password123'),
        role: 'seeker',
        isQaTester: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  logger.info('Seeded QA tester account (qa@ishbor.uz, parol: password123, cooldownlarsiz).');

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
