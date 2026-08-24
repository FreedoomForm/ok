CREATE TABLE "delivery_routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_route_stops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_routes_courierId_weekStart_name_key" ON "delivery_routes"("courierId", "weekStart", "name");
CREATE INDEX "delivery_routes_ownerId_weekStart_deletedAt_idx" ON "delivery_routes"("ownerId", "weekStart", "deletedAt");
CREATE INDEX "delivery_routes_courierId_weekStart_deletedAt_idx" ON "delivery_routes"("courierId", "weekStart", "deletedAt");
CREATE UNIQUE INDEX "delivery_route_stops_routeId_orderId_key" ON "delivery_route_stops"("routeId", "orderId");
CREATE UNIQUE INDEX "delivery_route_stops_routeId_position_key" ON "delivery_route_stops"("routeId", "position");
CREATE INDEX "delivery_route_stops_orderId_idx" ON "delivery_route_stops"("orderId");

ALTER TABLE "delivery_routes" ADD CONSTRAINT "delivery_routes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_routes" ADD CONSTRAINT "delivery_routes_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_route_stops" ADD CONSTRAINT "delivery_route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "delivery_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_route_stops" ADD CONSTRAINT "delivery_route_stops_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
