#!/bin/bash
# =======================================================
# Script: migrate-pgdata.sh
# Di chuyển thư mục Postgres data ra ngoài project
# và cập nhật docker-compose.yml
# =======================================================

set -e

PROJECT_DIR="$(pwd)"
OLD_DATA_DIR="$PROJECT_DIR/postgres-data"
NEW_DATA_DIR="$HOME/postgres-data"

echo "🚀 Bắt đầu di chuyển Postgres data..."
echo "   Project: $PROJECT_DIR"
echo "   Từ: $OLD_DATA_DIR"
echo "   Sang: $NEW_DATA_DIR"

# 1. Tạo thư mục mới nếu chưa có
if [ ! -d "$NEW_DATA_DIR" ]; then
  echo "📂 Tạo thư mục mới tại $NEW_DATA_DIR"
  mkdir -p "$NEW_DATA_DIR"
fi

# 2. Dừng docker-compose (tự nhận bản cũ hoặc mới)
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  echo "🛑 Dừng dịch vụ Docker..."
  if command -v docker-compose &> /dev/null; then
    docker-compose down || true
  else
    docker compose down || true
  fi
fi

# 3. Di chuyển dữ liệu (cần sudo vì Postgres tạo với quyền riêng)
if [ -d "$OLD_DATA_DIR" ]; then
  echo "📦 Di chuyển dữ liệu với sudo..."
  sudo mv "$OLD_DATA_DIR"/* "$NEW_DATA_DIR"/
  sudo rm -rf "$OLD_DATA_DIR"
else
  echo "⚠️ Không tìm thấy $OLD_DATA_DIR (bỏ qua bước copy)"
fi

# 4. Cập nhật docker-compose.yml
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  echo "📝 Cập nhật docker-compose.yml..."
  sed -i.bak "s#\./postgres-data#${NEW_DATA_DIR}#g" "$PROJECT_DIR/docker-compose.yml"
  echo "✅ docker-compose.yml đã được cập nhật. File backup: docker-compose.yml.bak"
else
  echo "⚠️ Không tìm thấy docker-compose.yml trong $PROJECT_DIR"
fi

# 5. Khởi động lại dịch vụ
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  echo "🚀 Khởi động lại Docker..."
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d
  else
    docker compose up -d
  fi
fi

echo "🎉 Hoàn tất! Postgres data đã được di chuyển ra $NEW_DATA_DIR"
