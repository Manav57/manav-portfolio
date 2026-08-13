# ─────────────────────────────────────────────
# MANAV PATIDAR — portfolio (static site)
# Served by nginx in a tiny Alpine container.
# ─────────────────────────────────────────────
FROM nginx:alpine

# optimized nginx config (gzip, caching, SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# the whole site — html, css, js, assets, frames
COPY . /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
