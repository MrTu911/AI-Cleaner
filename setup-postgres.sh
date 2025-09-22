#!/bin/bash
# =======================================================
# Script: setup-postgres.sh
# Mục đích: 
#   - Tạo volume thư mục cho Postgres và pgAdmin
#   - Sinh file .env với DATABASE_URL
#   - Khởi động docker-compose
# =======================================================

set -e

PROJECT_DIR="$(pwd)"
ENV_FILE="$PROJECT_DIR/.env"
POSTGRES_VOLUME="$HOME/postgres-data"
PGADMIN_VOLUME="$HOME/pgadmin-data"

DB_USER="ai_user"
DB_PASSWORD="ai_password"
DB_NAME="ai_database"
DB_PORT="5432"

echo "🚀 Bắt đầu cài đặt Postgres + pgAdmin..."

# 1. Tạo thư mục volumes
echo "📂 Tạo thư mục volumes..."
mkdir -p "$POSTGRES_VOLUME"
mkdir -p "$PGADMIN_VOLUME"

# 2. Sinh file .env nếu chưa có
if [ ! -f "$ENV_FILE" ]; then
  echo "📝 Tạo file .env với DATABASE_URL..."
  cat <<EOL > "$ENV_FILE"
# =======================================================
# Environment configuration for AI Data Cleaner
# =======================================================

# Prisma + Postgres
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"

# PgAdmin login
PGADMIN_DEFAULT_EMAIL=admin@hvhc.vn
PGADMIN_DEFAULT_PASSWORD=admin123
EOL
  echo "✅ File .env đã được tạo tại $ENV_FILE"
else
  echo "⚠️ File .env đã tồn tại, bỏ qua bước tạo."
fi

# 3. Khởi động docker-compose
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  echo "🐳 Khởi động docker-compose..."
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d
  else
    docker compose up -d
  fi
  echo "✅ Docker containers đã chạy!"
else
  echo "❌ Không tìm thấy docker-compose.yml trong $PROJECT_DIR"
  exit 1
fi

echo "🎉 Hoàn tất!"
echo "   - Postgres volume: $POSTGRES_VOLUME"
echo "   - PgAdmin volume: $PGADMIN_VOLUME"
echo "   - DATABASE_URL đã được ghi vào .env"
echo "   - Truy cập PgAdmin: http://localhost:8080 (user: admin@hvhc.vn / pass: admin123)"
