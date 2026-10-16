-- A third post per weekday (position 2). It starts switched off, at 19:30 Dhaka time, and posts only when notable.
INSERT INTO "SocialAutopostSlot" ("id", "dayOfWeek", "position", "enabled", "timeOfDay", "content", "format", "updatedAt")
SELECT 'slot_' || d || '_2', d, 2, false, '19:30', 'NOTABLE', 'PORTRAIT_4_5', now() FROM generate_series(0, 6) AS d
ON CONFLICT DO NOTHING;
