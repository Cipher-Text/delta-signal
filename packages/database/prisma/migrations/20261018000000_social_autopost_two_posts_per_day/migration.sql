-- Two posting times per weekday: each slot gets its own id and a position (0 = first, 1 = second).
ALTER TABLE "SocialAutopostSlot" DROP CONSTRAINT "SocialAutopostSlot_pkey";
ALTER TABLE "SocialAutopostSlot" ADD COLUMN "id" TEXT, ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
UPDATE "SocialAutopostSlot" SET "id" = 'slot_' || "dayOfWeek" || '_0';
ALTER TABLE "SocialAutopostSlot" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "SocialAutopostSlot" ADD CONSTRAINT "SocialAutopostSlot_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "SocialAutopostSlot_dayOfWeek_position_key" ON "SocialAutopostSlot"("dayOfWeek", "position");

-- The second post of every day starts switched off, at 18:00 Dhaka time.
INSERT INTO "SocialAutopostSlot" ("id", "dayOfWeek", "position", "enabled", "timeOfDay", "content", "format", "updatedAt")
SELECT 'slot_' || d || '_1', d, 1, false, '18:00', 'AUTO', 'PORTRAIT_4_5', now() FROM generate_series(0, 6) AS d;

-- Run history remembers which slot ran.
ALTER TABLE "SocialAutopostRun" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
