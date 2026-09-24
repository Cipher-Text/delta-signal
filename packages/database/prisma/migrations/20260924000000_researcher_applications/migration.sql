CREATE TYPE "ResearcherApplicationStatus" AS ENUM ('PENDING', 'NEEDS_INFORMATION', 'APPROVED', 'DECLINED');

ALTER TYPE "AuditAction" ADD VALUE 'RESEARCHER_APPLICATION_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'RESEARCHER_APPLICATION_REVIEW';

CREATE TABLE "ResearcherApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ResearcherApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearcherApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearcherApplication_userId_createdAt_idx" ON "ResearcherApplication"("userId", "createdAt");
CREATE INDEX "ResearcherApplication_status_createdAt_idx" ON "ResearcherApplication"("status", "createdAt");

ALTER TABLE "ResearcherApplication" ADD CONSTRAINT "ResearcherApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearcherApplication" ADD CONSTRAINT "ResearcherApplication_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
