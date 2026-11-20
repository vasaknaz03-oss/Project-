# Сервер ПодборПК. Собирается из корня репозитория:
#   docker build -f podbor-server/Dockerfile -t podbor-server .
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PODBOR_APP_DIR=/app/pc-builder DATA_DIR=/data PORT=8080

# Общие модули программы (подбор, Kufar, ИИ) и их единственная внешняя зависимость — SDK Anthropic
COPY pc-builder/package.json pc-builder/package-lock.json pc-builder/
RUN cd pc-builder && npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY pc-builder/server pc-builder/server
COPY podbor-server/package.json podbor-server/
COPY podbor-server/src podbor-server/src

# Том с данными должен принадлежать пользователю node, иначе сервер не сможет создать базу
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/v1/health >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "podbor-server/src/index.js"]
