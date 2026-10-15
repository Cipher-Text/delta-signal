-- Add a URL-friendly slug to every organization.
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;

-- Backfill: lowercase name, runs of non-alphanumerics become "-", trimmed, capped at 80 characters.
-- Names that collapse to the same slug get "-2", "-3", ... in creation order.
WITH base AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        left(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), 80),
        ''
      ),
      'organization'
    ) AS slug,
    "createdAt"
  FROM "Organization"
),
numbered AS (
  SELECT "id", slug, row_number() OVER (PARTITION BY slug ORDER BY "createdAt", "id") AS rn
  FROM base
)
UPDATE "Organization" o
SET "slug" = CASE WHEN n.rn = 1 THEN n.slug ELSE n.slug || '-' || n.rn END
FROM numbered n
WHERE o."id" = n."id";

ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
