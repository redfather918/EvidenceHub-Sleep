// EvidenceHub Sleep — Prisma Seed Script
// Seeds the SQLite database from the static TypeScript data
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";
import {
  claims,
  studies,
  topics,
  claimStudies,
  doseMappings,
  populationFits,
} from "../src/data/seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding EvidenceHub Sleep database...");

  // 1. Seed Topics
  console.log(`  Seeding ${topics.length} topics...`);
  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: {
        name: topic.name,
        description: topic.description,
        icon: topic.icon,
        claimCount: topic.claimCount,
      },
      create: {
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        description: topic.description,
        icon: topic.icon,
        claimCount: topic.claimCount,
      },
    });
  }

  // 2. Seed Studies
  const studyValues = Object.values(studies);
  console.log(`  Seeding ${studyValues.length} studies...`);
  for (const study of studyValues) {
    await prisma.study.upsert({
      where: { id: study.id },
      update: {
        pmid: study.pmid,
        doi: study.doi,
        title: study.title,
        journal: study.journal,
        authors: study.authors,
        year: study.year,
        sampleSize: study.sampleSize,
        duration: study.duration,
        intervention: study.intervention,
        outcome: study.outcome,
        effectSize: study.effectSize,
        result: study.result,
        studyType: study.studyType,
        population: study.population,
        url: study.url,
        strength: study.strength ?? 3,
      },
      create: {
        id: study.id,
        pmid: study.pmid,
        doi: study.doi,
        title: study.title,
        journal: study.journal,
        authors: study.authors,
        year: study.year,
        sampleSize: study.sampleSize,
        duration: study.duration,
        intervention: study.intervention,
        outcome: study.outcome,
        effectSize: study.effectSize,
        result: study.result,
        studyType: study.studyType,
        population: study.population,
        url: study.url,
        strength: study.strength ?? 3,
      },
    });
  }

  // 3. Seed Claims
  console.log(`  Seeding ${claims.length} claims...`);
  for (const claim of claims) {
    const topic = topics.find((t) => t.slug === claim.topicSlug);

    await prisma.claim.upsert({
      where: { slug: claim.slug },
      update: {
        text: claim.text,
        summary: claim.summary,
        category: claim.category,
        topicId: topic?.id,
        evidenceScore: claim.evidenceScore,
        humanRctScore: claim.humanRctScore,
        metaScore: claim.metaScore,
        mechanismScore: claim.mechanismScore,
        safetyScore: claim.safetyScore,
        confidence: claim.confidence,
        rctCount: claim.rctCount,
        metaCount: claim.metaCount,
        studyCount: claim.studyCount,
        dose: claim.dose,
        population: JSON.stringify(claim.population),
        limitations: JSON.stringify(claim.limitations),
        mechanism: JSON.stringify(claim.mechanism),
        faq: JSON.stringify(claim.faq),
        relatedSlugs: JSON.stringify(claim.relatedSlugs),
        keywords: JSON.stringify(claim.keywords),
      },
      create: {
        id: claim.id,
        slug: claim.slug,
        text: claim.text,
        summary: claim.summary,
        category: claim.category,
        topicId: topic?.id,
        evidenceScore: claim.evidenceScore,
        humanRctScore: claim.humanRctScore,
        metaScore: claim.metaScore,
        mechanismScore: claim.mechanismScore,
        safetyScore: claim.safetyScore,
        confidence: claim.confidence,
        rctCount: claim.rctCount,
        metaCount: claim.metaCount,
        studyCount: claim.studyCount,
        dose: claim.dose,
        population: JSON.stringify(claim.population),
        limitations: JSON.stringify(claim.limitations),
        mechanism: JSON.stringify(claim.mechanism),
        faq: JSON.stringify(claim.faq),
        relatedSlugs: JSON.stringify(claim.relatedSlugs),
        keywords: JSON.stringify(claim.keywords),
      },
    });
  }

  // 4. Seed Evidence Links
  console.log("  Seeding evidence links...");
  for (const [claimSlug, studyIds] of Object.entries(claimStudies)) {
    const claim = claims.find((c) => c.slug === claimSlug);
    if (!claim) continue;

    for (const studyId of studyIds) {
      const study = studies[studyId];
      if (!study) continue;

      const strength = study.strength || 3;

      await prisma.evidenceLink.upsert({
        where: {
          claimId_studyId: {
            claimId: claim.id,
            studyId: study.id,
          },
        },
        update: { strength },
        create: {
          claimId: claim.id,
          studyId: study.id,
          strength,
        },
      });
    }
  }

  // 5. Seed Dose Mappings
  console.log("  Seeding dose mappings...");
  for (const [claimSlug, mappings] of Object.entries(doseMappings)) {
    const claim = claims.find((c) => c.slug === claimSlug);
    if (!claim) continue;

    for (const dose of mappings) {
      await prisma.doseMapping.create({
        data: {
          claimId: claim.id,
          compound: dose.compound,
          doseRange: dose.doseRange,
          effect: dose.effect,
          optimal: dose.optimal,
        },
      });
    }
  }

  // 6. Seed Population Fits
  console.log("  Seeding population fits...");
  for (const [claimSlug, fits] of Object.entries(populationFits)) {
    const claim = claims.find((c) => c.slug === claimSlug);
    if (!claim) continue;

    for (const fit of fits) {
      await prisma.populationFit.create({
        data: {
          claimId: claim.id,
          group: fit.group,
          fit: fit.fit,
          note: fit.note,
        },
      });
    }
  }

  console.log("\nSeed complete!");
  console.log(`  Topics: ${topics.length}`);
  console.log(`  Studies: ${studyValues.length}`);
  console.log(`  Claims: ${claims.length}`);
  console.log(`  Evidence Links: ${Object.values(claimStudies).reduce((a, b) => a + b.length, 0)}`);
  console.log(`  Dose Mappings: ${Object.values(doseMappings).reduce((a, b) => a + b.length, 0)}`);
  console.log(`  Population Fits: ${Object.values(populationFits).reduce((a, b) => a + b.length, 0)}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
