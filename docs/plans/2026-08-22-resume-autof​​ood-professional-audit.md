# План возобновления AutoFood professional audit

## Цель

Продолжить непрерывное reference-driven улучшение AutoFood на ветке `manus/next-professional-improvements` без потери пользовательских функций, API response shapes, database safety или Vercel-совместимости. Каждое изменение должно быть минимальным, отдельно зафиксированным, проверенным production build и browser regression.

## Текущее состояние

- Последний опубликованный ранее commit: `e8ecd65`.
- Локальный commit, созданный до authentication failure: `8759826` — `Use canonical schema for Postgres deploy`.
- Этот commit исправляет critical deployment risk: `scripts/deploy_postgres.sh` больше не заменяет актуальный `prisma/schema.prisma` устаревшим `prisma/schema.postgres.prisma`.
- TypeScript, Prisma validation, shell syntax, production build и targeted 16/16 browser regression для изменения уже прошли.
- Push `8759826` не завершился из-за отклонённой GitHub-аутентификации; commit остаётся локальным.
- До блока authentication full gate был green: unit/integration baseline и 90/90 Playwright сценариев на Chromium и Mobile Chrome.

## Фазы выполнения после подтверждения

### 1. Восстановить публикацию без изменения кода

1. Безопасно обновить GitHub CLI credential configuration с использованием предоставленных пользователем credentials; не записывать credential в repository, plan, logs или source files.
2. Проверить authenticated repository access через GitHub CLI.
3. Повторить push только существующего commit `8759826` в `origin/manus/next-professional-improvements`.
4. Проверить, что local HEAD и remote HEAD совпадают, а working tree clean.

### 2. Завершить проверку canonical-schema fix

1. Повторно запустить full quality gate на latest pushed HEAD: unit tests, integration tests and all 90 Chromium/Mobile Chrome Playwright scenarios with retries.
2. Проверить production-like staging health and authenticated browser hydration for database workspace and role dashboards.
3. Убедиться, что generated Tambo catalogs восстановлены после любого build.
4. Не запускать `prisma db push`, migrations, seed или иные database-mutating commands against production; для проверки deploy script использовать shell syntax/static validation only unless a clearly local test database is explicitly identified.

### 3. Продолжить concrete production audit

После green gate продолжить smallest-safe improvements, приоритетно:

- устранение оставшегося schema/deployment drift вокруг legacy `prisma/schema.postgres.prisma`, только после проверки всех references и без удаления файла, если есть operational dependency;
- анализ bounded reads и memory pressure в database snapshot/export flows без изменения API response shape без отдельного согласования;
- Prisma query/index audit для фактически используемых scoped filters, с индексами только при доказанном query pattern и согласованной deployment strategy;
- дальнейшее удаление zero-usage CSS/effect code и hardcoded theme literals, сохраняя accessibility, active states and responsive behavior;
- проверка Server/Client boundaries и bundle payloads по официальным Next.js production recommendations.

### 4. Дисциплина каждого последующего изменения

Для каждого отдельного improvement соблюдать последовательность: чтение relevant skill guidance и surrounding contracts → minimal edit → typecheck → focused tests → targeted lint → production build → restore generated catalogs → restart local staging → browser verification on affected desktop/mobile flows → full or scoped regression → separate clear commit → push → clean-tree verification.

## Критерии готовности текущего восстановления

План считается выполненным, когда `8759826` опубликован, latest remote HEAD подтверждён, full gate снова green, staging доступен для browser checks, generated files clean, no destructive production database operation выполнена, а следующий audit improvement выбран на основании concrete repository evidence.

## Риски и допущения

- Предоставленные credentials считаются разрешением пользователя только для доступа к выбранному repository; они не должны попасть в tracked files or command output.
- Текущий remote authentication может потребовать повторного подключения GitHub account, если credential уже отозван или истёк.
- `schema.postgres.prisma` существенно отстаёт от canonical schema; его автоматическое удаление или синхронизация не входит в первый recovery step и требует отдельного impact audit.
- Полный Playwright gate зависит от локального staging server и тестовой database; при инфраструктурном сбое сначала диагностируется environment, а не изменяется production code вслепую.

## Источники и reference basis

- Next.js production guidance: https://nextjs.org/docs/app/guides/production-checklist
- Prisma query optimization guidance: https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance
- Tailwind color/theme guidance: https://tailwindcss.com/docs/colors
- Open-source architectural references retained for comparison: Enatega, Medusa and TastyIgniter.
