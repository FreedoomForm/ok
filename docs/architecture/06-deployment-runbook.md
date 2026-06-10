# Deployment Runbook

## Pre-deployment Checklist

- [ ] All CI checks pass (lint, typecheck, tests, build, security)
- [ ] No pending database migrations that haven't been tested
- [ ] Feature flags configured for new features
- [ ] Environment variables updated if needed
- [ ] PR has been reviewed and approved by at least one team member
- [ ] No critical bugs in the milestone/epic that would block release

## Deployment Process

### Automatic Deployment (Vercel)

AutoFood uses Vercel's native Git integration for deployments:

1. **Merge PR to main** — Vercel auto-deploys from the `main` branch
2. **Monitor deployment** in the Vercel dashboard (Build & Development Settings)
3. **Verify health endpoint**: `GET /api/health` → `200 OK`
4. **Check Vercel deployment logs** for any build warnings or errors

### Manual Deployment (Emergency)

If Vercel auto-deploy fails or a manual deploy is needed:

1. Go to Vercel Dashboard → AutoFood project
2. Click "Redeploy" on the target commit
3. Verify the deployment URL responds correctly

### Database Migrations

The project uses Prisma with a `db:push` strategy (not `migrate deploy`):

1. **Schema changes** are applied via `npx prisma db push` during the build process
2. **The build script** (`yarn build`) automatically runs `prisma generate` and `vercel-db-push.mjs`
3. **For destructive changes**, use `yarn db:push:accept-data-loss` with extreme caution
4. **Always backup** the database before destructive schema changes

## Post-deployment Verification

### Immediate Checks (< 2 minutes)

- [ ] Health check passes: `GET /api/health` → `200`
- [ ] Admin dashboard loads: `/middle-admin` or `/super-admin`
- [ ] Login works with test credentials
- [ ] No JavaScript errors in browser console (check for chunk load failures)

### Functional Checks (< 10 minutes)

- [ ] Create a test order and verify it appears in the dashboard
- [ ] Verify courier assignment works
- [ ] Check chat functionality
- [ ] Verify warehouse/inventory page loads
- [ ] Test customer-facing site on a subdomain

### Performance Checks

- [ ] Page load time < 3 seconds for dashboard
- [ ] API response time < 500ms for list endpoints
- [ ] No memory leaks (check Vercel function duration)
- [ ] Bundle size within budget (no chunk > 500KB)

## Rollback Procedure

### Quick Rollback (Vercel Dashboard)

1. Go to **Vercel Dashboard → AutoFood → Deployments**
2. Find the **previous successful deployment**
3. Click the **⋯** menu → **Redeploy**
4. Confirm the redeploy
5. Verify the rollback deployment is live

### Database Rollback

If a database migration was involved in the failed deployment:

1. **Identify the migration** that was applied
2. **Create a rollback migration** that reverses the schema change
3. **Apply the rollback** via `npx prisma db push` or a manual SQL script
4. **Verify data integrity** after rollback
5. **Communicate** the incident to the team

### Full Incident Response

1. **Detect** — Check Vercel alerts, user reports, or monitoring
2. **Assess** — Determine severity (P0: site down, P1: degraded, P2: minor)
3. **Mitigate** — Rollback or hotfix
4. **Communicate** — Notify stakeholders via designated channel
5. **Post-mortem** — Document root cause within 48 hours

## Monitoring

### Vercel Built-in

- **Deployment logs** — Build and runtime errors
- **Function logs** — API route execution details
- **Analytics** — Core Web Vitals, page load times
- **Speed Insights** — Real User Monitoring (RUM)

### Recommended Integrations

- **Sentry** — Application error tracking and performance monitoring
  - Capture unhandled exceptions in API routes
  - Track frontend errors with source maps
  - Set up alerts for error rate spikes
- **Vercel Analytics** — Performance monitoring
  - Web Vitals (LCP, FID, CLS)
  - Route-level performance data
- **Uptime Robot / Better Stack** — External uptime monitoring
  - Monitor `GET /api/health` endpoint
  - Alert on downtime > 60 seconds

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| API Error Rate | > 1% | > 5% |
| API Latency (p95) | > 1s | > 3s |
| Page Load (LCP) | > 2.5s | > 4s |
| Function Duration | > 5s | > 10s |
| Deployment Failures | 1 in 24h | 2 in 24h |

## CI/CD Pipeline Overview

### Workflow: CI (`ci.yml`)
Triggers on push/PR to `main` or `develop`.

| Job | Description | Dependencies |
|-----|-------------|-------------|
| lint-and-typecheck | ESLint + TypeScript check | None |
| unit-tests | Vitest with coverage | None |
| build | Next.js build + bundle size check | lint-and-typecheck |
| db-migration-check | Prisma schema validation | None |
| security | Gitleaks + npm audit | None |

### Workflow: Deploy (`deploy.yml`)
Triggers on push to `main` only.

| Job | Description |
|-----|-------------|
| deploy | Build verification gate before Vercel auto-deploy |

### Workflow: Preview (`preview.yml`)
Triggers on PR to `main`.

| Job | Description |
|-----|-------------|
| preview-check | Typecheck + Lint + Tests (quality gate for PR previews) |

### Workflow: Secret Scan (`gitleaks.yml`)
Triggers on push/PR + manual dispatch.

### Workflow: Nightly Quality (`nightly-quality.yml`)
Triggers daily at 03:17 UTC + manual dispatch.

### Workflow: CodeQL (`codeql.yml`)
Triggers on push/PR to `main` + weekly schedule.

## Environment Variables

### Required for Build

| Variable | Description | Source |
|----------|-------------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Vercel Environment |
| `AUTH_SECRET` | NextAuth.js secret | Vercel Environment |
| `NEXTAUTH_SECRET` | NextAuth.js secondary secret | Vercel Environment |
| `JWT_SECRET` | JWT signing secret | Vercel Environment |

### Optional

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps API key | Vercel Environment |
| `FIREBASE_PROJECT_ID` | Firebase project | Vercel Environment |
| `SENTRY_DSN` | Sentry error tracking | Vercel Environment |

> **Important**: Never hardcode secrets in workflow files. Always use GitHub Secrets or Vercel Environment Variables.
