#!/bin/sh
# Bật khối proxy /api/ khi và chỉ khi API_UPSTREAM được đặt. Chạy trong
# /docker-entrypoint.d/ của image nginx, trước khi nginx đọc cấu hình.
set -eu

target_dir="/etc/nginx/api-proxy"
target="${target_dir}/api.conf"

mkdir -p "$target_dir"
rm -f "$target"

if [ -z "${API_UPSTREAM:-}" ]; then
    echo "30-api-proxy.sh: API_UPSTREAM trống, chỉ phục vụ file tĩnh."
    exit 0
fi

# proxy_pass không kèm đường dẫn thì nginx giữ nguyên URI gốc, nên /api/v1/... tới
# backend vẫn đúng nguyên vẹn. Dấu / ở cuối sẽ làm hỏng điều đó.
upstream="${API_UPSTREAM%/}"

sed "s|__API_UPSTREAM__|${upstream}|" /etc/nginx/api-proxy-template/api.conf > "$target"
echo "30-api-proxy.sh: proxy /api/ -> ${upstream}"
