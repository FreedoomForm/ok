# Sites Module (Multi-Tenant)

Multi-tenant website and customer-facing portal for the AutoFood delivery platform.

## Purpose

Handles subdomain-based website rendering, customer authentication (OTP + password), customer profile management, today's menu display, meal plan toggling, admin website builder (with AI editing), and order history for site customers.

## Directory Structure

```
src/modules/sites/
├── contracts/
│   ├── sites.dto.ts        # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── sites.repository.ts # Prisma queries + OTP + SMS + AI editing
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── get-site.ts           # Get public website data (PUBLIC)
│   │   ├── get-customer-profile.ts # Get customer profile
│   │   ├── get-today-menu.ts     # Get today's menu for customer
│   │   ├── get-customer-plan.ts  # Get customer's meal plan status
│   │   └── index.ts
│   ├── commands/
│   │   ├── update-site.ts        # Admin: update website settings
│   │   ├── site-login.ts         # Customer: password login
│   │   ├── site-register.ts      # Customer: register new account
│   │   ├── site-send-code.ts     # Customer: send OTP code
│   │   ├── site-verify-code.ts   # Customer: verify OTP code
│   │   ├── customer-logout.ts    # Customer: logout
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeGetSite(query)` | Get public website data by subdomain (no auth) |
| `executeGetCustomerProfile(query)` | Get authenticated customer's profile |
| `executeGetTodayMenu(query)` | Get today's menu for customer |
| `executeGetCustomerPlan(query)` | Get customer's auto-order plan status |

### Commands
| Function | Description |
|---|---|
| `executeUpdateSite(command)` | Admin: update website settings |
| `executeSiteLogin(command)` | Customer: login with phone + password |
| `executeSiteRegister(command)` | Customer: register new account |
| `executeSiteSendCode(command)` | Customer: send OTP code via SMS |
| `executeSiteVerifyCode(command)` | Customer: verify OTP code |
| `executeCustomerLogout(command)` | Customer: clear auth cookie |

### Infrastructure
| Function | Description |
|---|---|
| `findSiteBySubdomain()` | Raw website query |
| `findAdminWebsiteSettings()` | Raw admin settings query |
| `findCustomerProfile()` | Raw customer profile query |
| `updateCustomerProfile()` | Raw customer profile update |
| `findTodayMenu()` | Raw today menu query with menu-set support |
| `findCustomerPlan()` | Raw customer plan query |
| `toggleCustomerPlan()` | Toggle auto-orders + pause/resume orders |
| `listCustomerOrders()` | Raw customer order list |
| `upsertWebsite()` | Raw website upsert |
| `sendSiteOtpCode()` | Send OTP via SMS provider |
| `verifySiteOtpCode()` | Verify OTP from store |
| `siteLogin()` | Customer password login |
| `siteRegister()` | Customer registration |
| `aiEditWebsite()` | AI-powered website editing (Gemini) |
| `getSiteGroupAdminIds()` | Get admin IDs for site group |
| `normalizePhone()` | Phone number normalization |

## Key DTOs

| DTO | Purpose |
|---|---|
| `WebsiteDTO` | Public website data (subdomain, style, content) |
| `AdminWebsiteSettingsDTO` | Admin panel view with style presets |
| `SiteUpdateData` | Input for updating website |
| `SiteUpdateResult` | Result of website update |
| `AiEditData` | Input for AI website editing |
| `AiEditResult` | Result of AI edit (may include content preview) |
| `CustomerProfileDTO` | Customer profile for site portal |
| `CustomerProfileUpdateData` | Input for customer profile update |
| `SiteAuthResult` | Login result with token + customer info |
| `SiteSendCodeResult` | OTP send result |
| `SiteRegistrationData` | Input for customer registration |
| `SiteRegistrationResult` | Registration result |
| `CustomerPlanDTO` | Customer auto-order plan |
| `TogglePlanResult` | Result of plan toggle |
| `TodayMenuDTO` | Today's menu with dishes |
| `CustomerLogoutResult` | Logout result |

## Role-Based Scoping Rules

| Access Type | Scope |
|---|---|
| Public (no auth) | `GET /api/sites/[subdomain]` — website data |
| Customer auth | Profile, orders, today-menu, plan — scoped to own data |
| Admin auth (`MIDDLE_ADMIN`/`SUPER_ADMIN`) | Website builder, AI edit — scoped to own site |
| OTP-based auth | SMS code verification — rate limited |

## Notes

- Cookie-setting routes (verify-code, login, logout) use manual handlers since `createPublicApiRoute` doesn't support response cookies.
- Customer auth routes use `getCustomerFromRequest` via `createCustomerApiRoute`.
- AI-edit logic (Gemini integration) lives in the repository layer; future refactors can split AI generation from persistence.
