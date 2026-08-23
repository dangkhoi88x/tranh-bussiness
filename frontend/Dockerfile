# syntax=docker/dockerfile:1

# Vite nhúng biến VITE_* ngay lúc build, nên mỗi môi trường cần một image riêng.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Mặc định gọi API cùng origin qua reverse proxy của nginx bên dưới. Đặt URL tuyệt đối
# nếu API nằm ở tên miền khác — khi đó nhớ khai báo CORS_ALLOWED_ORIGINS ở backend.
ARG VITE_API_BASE=/api/v1
# Dùng cho canonical URL và thẻ Open Graph, ví dụ https://bubblememories.vn
ARG VITE_SITE_URL=
# Prerender SEO cần API catalogue chạy được ngay lúc build và một URL tuyệt đối.
# Bỏ trống cả hai thì chỉ build SPA, không sinh trang tĩnh/sitemap.
ARG SEO_API_BASE=
ARG SEO_SITE_URL=
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_SITE_URL=$VITE_SITE_URL \
    SEO_API_BASE=$SEO_API_BASE \
    SEO_SITE_URL=$SEO_SITE_URL

# seo:prerender đã tự chạy npm run build nên không build hai lần.
RUN if [ -n "$SEO_API_BASE" ] && [ -n "$SEO_SITE_URL" ]; then \
      npm run seo:prerender; \
    else \
      echo "SEO_API_BASE/SEO_SITE_URL chưa đặt: bỏ qua prerender, crawler sẽ chỉ thấy metadata trang chủ."; \
      npm run build; \
    fi

FROM nginx:1.27-alpine

# Cổng lắng nghe: đổi được lúc chạy cho các nền tảng tự chọn cổng.
ENV NGINX_PORT=8080
# Bỏ trống là chỉ phục vụ file tĩnh; đặt ví dụ http://backend:8080 để nginx proxy /api/.
ENV API_UPSTREAM=""

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/api-proxy.conf /etc/nginx/api-proxy-template/api.conf
COPY nginx/30-api-proxy.sh /docker-entrypoint.d/30-api-proxy.sh
RUN chmod +x /docker-entrypoint.d/30-api-proxy.sh

EXPOSE 8080
