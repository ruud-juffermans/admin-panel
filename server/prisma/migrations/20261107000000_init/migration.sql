-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "website";

-- CreateEnum
CREATE TYPE "website"."ContactStatus" AS ENUM ('new', 'responded', 'archived');

-- CreateTable
CREATE TABLE "website"."contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT NOT NULL,
    "status" "website"."ContactStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website"."newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website"."page_views" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website"."llm_topups" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount_usd" DOUBLE PRECISION NOT NULL,
    "topped_up_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_topups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_submissions_created_at_idx" ON "website"."contact_submissions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "website"."newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "page_views_path_idx" ON "website"."page_views"("path");

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "website"."page_views"("created_at");

-- CreateIndex
CREATE INDEX "llm_topups_provider_topped_up_at_idx" ON "website"."llm_topups"("provider", "topped_up_at");
