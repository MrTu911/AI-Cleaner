#!/bin/bash
# =======================================================
# Script: fix-inotify-limit.sh
# Mục đích: Tăng giới hạn inotify watches để Next.js,
# Turbopack, Webpack... không bị lỗi "OS file watch limit".
# =======================================================

set -e

echo "🔧 Kiểm tra giới hạn hiện tại..."
current=$(cat /proc/sys/fs/inotify/max_user_watches)
echo "   Hiện tại: $current"

echo "🚀 Đang cập nhật cấu hình sysctl..."
sudo tee -a /etc/sysctl.conf > /dev/null <<EOL

# Tăng giới hạn inotify cho Node.js / Next.js / Turbopack
fs.inotify.max_user_watches=524288
fs.inotify.max_user_instances=512
EOL

echo "✅ Áp dụng thay đổi..."
sudo sysctl -p

echo "🎉 Hoàn tất!"
new=$(cat /proc/sys/fs/inotify/max_user_watches)
echo "   Giới hạn mới: $new"
