CREATE TYPE "SocialContentType" AS ENUM ('CURRENT_WEATHER', 'WEATHER_FORECAST', 'RIVER_SIGNAL', 'ENVIRONMENTAL_ALERT', 'BIODIVERSITY_OBSERVATION');
CREATE TYPE "SocialDraftStatus" AS ENUM ('DRAFT', 'RENDERED', 'APPROVED', 'ARCHIVED');
CREATE TYPE "SocialCardFormat" AS ENUM ('PORTRAIT_4_5', 'SQUARE_1_1');

ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_DRAFT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_DRAFT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_CARD_RENDER';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_DRAFT_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_DRAFT_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_CARD_DOWNLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_PUBLICATION_MARK';

CREATE TABLE "SocialPostDraft" (
  "id" TEXT NOT NULL,
  "type" "SocialContentType" NOT NULL,
  "status" "SocialDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "format" "SocialCardFormat" NOT NULL DEFAULT 'PORTRAIT_4_5',
  "locale" TEXT NOT NULL DEFAULT 'en',
  "headline" TEXT NOT NULL,
  "summary" TEXT,
  "caption" TEXT,
  "disclaimer" TEXT,
  "templateKey" TEXT NOT NULL DEFAULT 'delta-signal-v1',
  "districtId" TEXT,
  "sourceId" TEXT,
  "sourceLabel" TEXT NOT NULL,
  "sourceObservedAt" TIMESTAMP(3),
  "sourceSnapshot" JSONB NOT NULL,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "publishedNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialPostDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialRenderedAsset" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "format" "SocialCardFormat" NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "renderVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialRenderedAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialRenderedAsset_storageKey_key" ON "SocialRenderedAsset"("storageKey");
CREATE INDEX "SocialPostDraft_status_createdAt_idx" ON "SocialPostDraft"("status", "createdAt");
CREATE INDEX "SocialPostDraft_type_createdAt_idx" ON "SocialPostDraft"("type", "createdAt");
CREATE INDEX "SocialPostDraft_districtId_idx" ON "SocialPostDraft"("districtId");
CREATE INDEX "SocialRenderedAsset_draftId_createdAt_idx" ON "SocialRenderedAsset"("draftId", "createdAt");

ALTER TABLE "SocialPostDraft" ADD CONSTRAINT "SocialPostDraft_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialPostDraft" ADD CONSTRAINT "SocialPostDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialPostDraft" ADD CONSTRAINT "SocialPostDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialPostDraft" ADD CONSTRAINT "SocialPostDraft_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialRenderedAsset" ADD CONSTRAINT "SocialRenderedAsset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "SocialPostDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
