-- Add indexes on RestorationProject foreign keys that are used in list
-- queries filtered by organization and in ownership checks by creator.
CREATE INDEX "RestorationProject_organizationId_idx" ON "RestorationProject"("organizationId");
CREATE INDEX "RestorationProject_createdById_idx" ON "RestorationProject"("createdById");
