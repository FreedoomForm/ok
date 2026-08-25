-- Add the route resource calendar kind without rewriting existing availability rows.
ALTER TYPE "ResourceKind" ADD VALUE IF NOT EXISTS 'ROUTE';
