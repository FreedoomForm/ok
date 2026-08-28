ALTER TABLE "delivery_routes" ADD COLUMN "boundary" JSONB;

CREATE INDEX "delivery_routes_isActive_weekStart_idx" ON "delivery_routes"("isActive", "weekStart");
