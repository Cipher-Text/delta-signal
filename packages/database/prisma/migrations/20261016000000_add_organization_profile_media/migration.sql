-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "logoKey" TEXT;

-- CreateTable
CREATE TABLE "OrganizationPhoto" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSocialLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationPhoto_organizationId_sortOrder_idx" ON "OrganizationPhoto"("organizationId", "sortOrder");

-- CreateIndex
CREATE INDEX "OrganizationSocialLink_organizationId_idx" ON "OrganizationSocialLink"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSocialLink_organizationId_platform_key" ON "OrganizationSocialLink"("organizationId", "platform");

-- AddForeignKey
ALTER TABLE "OrganizationPhoto" ADD CONSTRAINT "OrganizationPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSocialLink" ADD CONSTRAINT "OrganizationSocialLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
