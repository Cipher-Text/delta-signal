ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SOCIAL_AUTOPOST_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SOCIAL_AUTOPOST_TOGGLE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SOCIAL_AUTOPOST_RUN';

-- CreateEnum
CREATE TYPE "SocialAutopostRunStatus" AS ENUM ('QUEUED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "SocialAutopostSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "platformAccountId" TEXT,
    "captionFooter" TEXT NOT NULL DEFAULT '#DeltaSignal #Bangladesh',
    "enabledById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAutopostSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAutopostSlot" (
    "dayOfWeek" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timeOfDay" TEXT NOT NULL DEFAULT '08:00',
    "content" TEXT NOT NULL DEFAULT 'AUTO',
    "format" "SocialCardFormat" NOT NULL DEFAULT 'PORTRAIT_4_5',
    "lastRunOn" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAutopostSlot_pkey" PRIMARY KEY ("dayOfWeek")
);

-- CreateTable
CREATE TABLE "SocialAutopostRun" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "SocialAutopostRunStatus" NOT NULL,
    "reason" TEXT,
    "series" TEXT,
    "headline" TEXT,
    "draftId" TEXT,
    "publicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAutopostRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialAutopostRun_createdAt_idx" ON "SocialAutopostRun"("createdAt");
