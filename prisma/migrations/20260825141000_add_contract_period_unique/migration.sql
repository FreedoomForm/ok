-- Prevent duplicate recurring segments under concurrent scheduler invocations.
CREATE UNIQUE INDEX "contract_periods_contractId_startDate_endDate_key"
  ON "contract_periods"("contractId", "startDate", "endDate");
