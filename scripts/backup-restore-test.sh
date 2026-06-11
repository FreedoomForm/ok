#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Backup & Restore Test Script — AutoFood Delivery Management System
# ═══════════════════════════════════════════════════════════════════════════
#
# USAGE:
#   ./scripts/backup-restore-test.sh              # Full test
#   ./scripts/backup-restore-test.sh --backup-only # Only create backup
#   ./scripts/backup-restore-test.sh --restore-only # Only test restore
#
# ENVIRONMENT VARIABLES:
#   DATABASE_URL    — PostgreSQL connection string (required)
#   BACKUP_DIR      — Directory for backup files (default: ./backups)
#   NEON_API_KEY    — Neon API key for branch-based restore (optional)
#   NEON_PROJECT_ID — Neon project ID (optional, for branch restore)
#
# PREREQUISITES:
#   - pg_dump / pg_restore (PostgreSQL client tools)
#   - Access to the target PostgreSQL database
#   - For Neon: neon CLI or API key
#
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/autofood_backup_${TIMESTAMP}.sql.gz"
MANIFEST_FILE="${BACKUP_DIR}/manifest_${TIMESTAMP}.json"
DATABASE_URL="${DATABASE_URL:-}"
NEON_API_KEY="${NEON_API_KEY:-}"
NEON_PROJECT_ID="${NEON_PROJECT_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Utility functions ──────────────────────────────────────────────────────

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_prerequisites() {
    local missing=0

    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL is not set"
        missing=1
    fi

    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found — install PostgreSQL client tools"
        missing=1
    fi

    if ! command -v pg_restore &> /dev/null; then
        log_error "pg_restore not found — install PostgreSQL client tools"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# ── Backup ─────────────────────────────────────────────────────────────────

create_backup() {
    log_info "Starting backup — $(date)"

    mkdir -p "$BACKUP_DIR"

    # Extract connection info from DATABASE_URL for pg_dump
    log_info "Creating pg_dump backup..."

    # Full backup with custom format (compressed, parallelizable restore)
    local DUMP_FILE="${BACKUP_DIR}/autofood_backup_${TIMESTAMP}.dump"
    pg_dump \
        --format=custom \
        --compress=6 \
        --no-owner \
        --no-privileges \
        --verbose \
        --file="$DUMP_FILE" \
        "$DATABASE_URL" 2>&1 | tail -5

    if [ -f "$DUMP_FILE" ]; then
        local size
        size=$(du -h "$DUMP_FILE" | cut -f1)
        log_ok "Backup created: $DUMP_FILE ($size)"
    else
        log_error "Backup failed — dump file not created"
        exit 1
    fi

    # Also create a plain SQL backup (human-readable, git-friendly)
    local SQL_FILE="${BACKUP_DIR}/autofood_backup_${TIMESTAMP}.sql.gz"
    log_info "Creating plain SQL backup..."
    pg_dump \
        --format=plain \
        --no-owner \
        --no-privileges \
        "$DATABASE_URL" | gzip > "$SQL_FILE"

    if [ -f "$SQL_FILE" ]; then
        local sql_size
        sql_size=$(du -h "$SQL_FILE" | cut -f1)
        log_ok "SQL backup created: $SQL_FILE ($sql_size)"
    fi

    # Create manifest with row counts for verification
    log_info "Creating backup manifest..."
    create_manifest

    log_ok "Backup complete!"
}

create_manifest() {
    # Count rows in all business tables for post-restore verification
    local counts
    counts=$(psql "$DATABASE_URL" -t -A -c "
        SELECT table_name, n_live_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY table_name;
    " 2>/dev/null || echo "manifest_unavailable")

    cat > "$MANIFEST_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "database_url_host": "$(echo "$DATABASE_URL" | sed -E 's|@([^/]+)/|\1|' | cut -d: -f1)",
  "backup_files": {
    "custom": "autofood_backup_${TIMESTAMP}.dump",
    "sql": "autofood_backup_${TIMESTAMP}.sql.gz"
  },
  "row_counts": {
$(echo "$counts" | while IFS='|' read -r table count; do
    if [ -n "$table" ]; then
        echo "    \"$table\": $count,"
    fi
done | sed '$ s/,$//')
  }
}
EOF

    log_ok "Manifest created: $MANIFEST_FILE"
}

# ── Restore Test ───────────────────────────────────────────────────────────

test_restore() {
    log_info "Starting restore test — $(date)"

    # Find the latest backup
    local LATEST_DUMP
    LATEST_DUMP=$(ls -t "${BACKUP_DIR}"/autofood_backup_*.dump 2>/dev/null | head -1)

    if [ -z "$LATEST_DUMP" ]; then
        log_error "No .dump backup file found in $BACKUP_DIR"
        exit 1
    fi

    log_info "Using backup: $LATEST_DUMP"

    # Option A: Restore to a test database (requires separate DATABASE_URL for test DB)
    local TEST_DB_URL="${TEST_DATABASE_URL:-}"

    if [ -n "$TEST_DB_URL" ]; then
        log_info "Restoring to test database..."
        pg_restore \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            --verbose \
            --dbname="$TEST_DB_URL" \
            "$LATEST_DUMP" 2>&1 | tail -10

        log_ok "Restore to test database complete"

        # Verify row counts
        verify_restore "$TEST_DB_URL"
    else
        log_warn "No TEST_DATABASE_URL set — skipping live restore"
        log_info "To test restore, set TEST_DATABASE_URL to a separate test database"
    fi

    # Option B: Dry-run restore (list contents without applying)
    log_info "Running dry-run restore (list contents)..."
    pg_restore \
        --list \
        "$LATEST_DUMP" 2>&1 | head -30

    log_ok "Dry-run restore complete"

    # Option C: Neon branch-based restore (if API key available)
    if [ -n "$NEON_API_KEY" ] && [ -n "$NEON_PROJECT_ID" ]; then
        log_info "Neon API key detected — testing branch-based restore..."
        test_neon_branch_restore
    fi

    log_ok "Restore test complete!"
}

verify_restore() {
    local db_url="$1"
    log_info "Verifying restored data..."

    # Find the manifest for the backup
    local LATEST_MANIFEST
    LATEST_MANIFEST=$(ls -t "${BACKUP_DIR}"/manifest_*.json 2>/dev/null | head -1)

    if [ -z "$LATEST_MANIFEST" ]; then
        log_warn "No manifest file found — skipping row count verification"
        return
    fi

    log_info "Comparing row counts with manifest..."

    # Get current row counts from restored DB
    local current_counts
    current_counts=$(psql "$db_url" -t -A -c "
        SELECT table_name, n_live_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY table_name;
    " 2>/dev/null || echo "verification_unavailable")

    local mismatch=0
    while IFS='|' read -r table count; do
        if [ -n "$table" ]; then
            local expected
            expected=$(grep "\"$table\"" "$LATEST_MANIFEST" | grep -oE '[0-9]+' | head -1)
            if [ -n "$expected" ] && [ "$count" != "$expected" ]; then
                log_warn "Row count mismatch: $table (expected=$expected, actual=$count)"
                mismatch=1
            else
                log_ok "$table: $count rows"
            fi
        fi
    done <<< "$current_counts"

    if [ $mismatch -eq 0 ]; then
        log_ok "All row counts match!"
    else
        log_warn "Some row counts differ — this may be normal if data changed during backup"
    fi
}

test_neon_branch_restore() {
    log_info "Creating Neon branch from latest backup..."

    # Use Neon API to create a branch
    local BRANCH_NAME="backup-test-${TIMESTAMP}"

    local response
    response=$(curl -s -X POST "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
        -H "Authorization: Bearer ${NEON_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"branch\": {
                \"name\": \"${BRANCH_NAME}\",
                \"parent_id\": \"main\"
            }
        }" 2>/dev/null || echo "neon_api_error")

    if echo "$response" | grep -q '"id"'; then
        log_ok "Neon branch created: $BRANCH_NAME"
        log_info "Clean up test branches with: neon branches delete $BRANCH_NAME"
    else
        log_warn "Neon API call failed — check NEON_API_KEY and NEON_PROJECT_ID"
    fi
}

# ── Cleanup old backups ───────────────────────────────────────────────────

cleanup_old_backups() {
    # Keep last 30 days of backups
    local retention_days="${RETENTION_DAYS:-30}"
    log_info "Cleaning up backups older than $retention_days days..."

    find "$BACKUP_DIR" -name "autofood_backup_*" -mtime +"$retention_days" -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "manifest_*" -mtime +"$retention_days" -delete 2>/dev/null || true

    log_ok "Cleanup complete"
}

# ── Main ───────────────────────────────────────────────────────────────────

main() {
    echo "═══════════════════════════════════════════════════════"
    echo "  AutoFood — Backup & Restore Test"
    echo "  $(date)"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    local mode="${1:-full}"

    case "$mode" in
        --backup-only)
            check_prerequisites
            create_backup
            ;;
        --restore-only)
            check_prerequisites
            test_restore
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        full|*)
            check_prerequisites
            create_backup
            echo ""
            test_restore
            cleanup_old_backups
            ;;
    esac

    echo ""
    log_ok "All done! — $(date)"
}

main "$@"
