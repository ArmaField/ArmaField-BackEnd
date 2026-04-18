#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="armafield_${TIMESTAMP}.sql.gz"

pg_dump -h db -U armafield armafield | gzip > "${BACKUP_DIR}/${FILENAME}"

# Keep last 30 backups
ls -t "${BACKUP_DIR}"/armafield_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm

echo "Backup created: ${FILENAME}"
