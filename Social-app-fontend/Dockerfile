# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY . .
ARG REACT_APP_API_URL=http://localhost:8081
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV GENERATE_SOURCEMAP=false
RUN pnpm build

FROM nginx:1.29.2-alpine-slim
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
