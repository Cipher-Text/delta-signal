-- Four more shareable card types: one-place snapshot, coastal (marine) ranking, weekly/monthly summary, free-form editorial.
ALTER TYPE "SocialContentType" ADD VALUE IF NOT EXISTS 'DISTRICT_SNAPSHOT';
ALTER TYPE "SocialContentType" ADD VALUE IF NOT EXISTS 'NATIONAL_COASTAL_WATCH';
ALTER TYPE "SocialContentType" ADD VALUE IF NOT EXISTS 'NATIONAL_PERIOD_SUMMARY';
ALTER TYPE "SocialContentType" ADD VALUE IF NOT EXISTS 'CUSTOM_EDITORIAL';
