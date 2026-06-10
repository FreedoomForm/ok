# Secret Management Policy

## 1. Secret Categories

| Category | Environment Vars | Storage | Rotation Frequency |
|---|---|---|---|
| Database | `DATABASE_URL` | Neon Console / Vercel Env | Quarterly or on team member change |
| Auth | `AUTH_SECRET`, `JWT_SECRET` | Vercel Env | Quarterly |
| OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console | On compromise suspicion |
| Firebase | `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_FIREBASE_*` | Firebase Console | On compromise suspicion |
| SMS | `TEXTBELT_API_KEY`, `INFOBIP_API_KEY`, `SMS_API_TOKEN` | Provider Console | On compromise suspicion |
| AI | `GEMINI_API_KEY`, `NEXT_PUBLIC_TAMBO_API_KEY` | Provider Console | On compromise suspicion |
| Routing | `OPENROUTESERVICE_API_KEY` | ORS Dashboard | On compromise suspicion |
| Cron | `CRON_SECRET`, `CRON_SECRET_TOKEN` | Vercel Env | Quarterly |

## 2. Secret Scanning

### Automated: Gitleaks GitHub Action
- Runs on every push to `main`, `master`, `develop`
- Runs on every pull request targeting those branches
- Uses custom rules in `.gitleaks.toml` for project-specific patterns (Firebase, SMS, AI keys)
- Can be triggered manually via GitHub Actions "Run workflow" button

### Local: Pre-commit hook (recommended)
```bash
# Install gitleaks locally (macOS)
brew install gitleaks

# Run manually before pushing
gitleaks detect --source . --config .gitleaks.toml

# Or add as pre-commit hook
gitleaks protect --source . --config .gitleaks.toml --staged
```

## 3. `.env` File Rules

1. **Never commit `.env` or `.env.local`** — both are in `.gitignore`
2. **`.env.example` is the source of truth** for required environment variables
3. **When adding a new env var**, update `.env.example` first, then set it in Vercel
4. **Service account JSON files** must never be committed — store the value in `FIREBASE_SERVICE_ACCOUNT_KEY` env var instead

## 4. Rotation Procedure

When a secret needs rotation:

1. Generate new secret value
2. Update in provider console (Neon, Google, Firebase, etc.)
3. Update in Vercel environment variables
4. Trigger redeploy (`vercel --prod`)
5. Verify the application works with the new secret
6. Revoke the old secret value in provider console
7. Document the rotation in team chat with date and reason

## 5. Compromise Response

If a secret is suspected compromised:

1. **Immediately** rotate the secret (see procedure above)
2. Review gitleaks scan results and git history for exposure
3. Check Vercel deployment logs for unauthorized access
4. Notify all team members
5. If `DATABASE_URL` is compromised: rotate password in Neon + update all environments
6. If `AUTH_SECRET` is compromised: all existing sessions are invalidated on next deploy

## 6. Files That Must Never Be Committed

```
.env
.env.local
.env.*.local
*.key
*.pem
credentials*
service-account*.json
*.service-account.json
secrets/
.secrets
.pgpass
```

All of these patterns are in `.gitignore`. The gitleaks workflow provides a second safety net.
