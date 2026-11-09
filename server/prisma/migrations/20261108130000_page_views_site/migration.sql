-- Page views now carry the website they were recorded on. Existing rows all
-- came from the portfolio, which the default covers.
ALTER TABLE "website"."page_views" ADD COLUMN "site" TEXT NOT NULL DEFAULT 'ruudjuffermans.nl';

-- CreateIndex
CREATE INDEX "page_views_site_created_at_idx" ON "website"."page_views"("site", "created_at");
