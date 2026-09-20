-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK');

-- CreateEnum
CREATE TYPE "SocialPlatformAccountStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "SocialPublicationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_PLATFORM_CONNECT';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_PLATFORM_DISCONNECT';
ALTER TYPE "AuditAction" ADD VALUE 'SOCIAL_PUBLISH_REQUEST';

-- CreateTable
CREATE TABLE "SocialPlatformAccount" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accessTokenCipher" TEXT NOT NULL,
    "status" "SocialPlatformAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "connectedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPlatformAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPublication" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "platformAccountId" TEXT NOT NULL,
    "renderedAssetId" TEXT NOT NULL,
    "status" "SocialPublicationStatus" NOT NULL DEFAULT 'PENDING',
    "externalPostId" TEXT,
    "externalUrl" TEXT,
    "error" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPlatformAccount_platform_externalAccountId_key" ON "SocialPlatformAccount"("platform", "externalAccountId");

-- CreateIndex
CREATE INDEX "SocialPublication_draftId_idx" ON "SocialPublication"("draftId");

-- CreateIndex
CREATE INDEX "SocialPublication_platformAccountId_createdAt_idx" ON "SocialPublication"("platformAccountId", "createdAt");

-- AddForeignKey
ALTER TABLE "SocialPlatformAccount" ADD CONSTRAINT "SocialPlatformAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPublication" ADD CONSTRAINT "SocialPublication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "SocialPostDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPublication" ADD CONSTRAINT "SocialPublication_platformAccountId_fkey" FOREIGN KEY ("platformAccountId") REFERENCES "SocialPlatformAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPublication" ADD CONSTRAINT "SocialPublication_renderedAssetId_fkey" FOREIGN KEY ("renderedAssetId") REFERENCES "SocialRenderedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPublication" ADD CONSTRAINT "SocialPublication_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

