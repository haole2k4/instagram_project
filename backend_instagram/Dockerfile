# syntax=docker/dockerfile:1

# ---- Build Stage ----
FROM maven:3.9-eclipse-temurin-25-alpine AS builder

WORKDIR /app

# Copy pom.xml và download dependencies trước (cache layer)
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn dependency:go-offline -B

# Copy source code và build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn package -DskipTests -B

# Tách layered jar để cache layer runtime theo mức độ thay đổi
RUN java -Djarmode=tools -jar target/*.jar extract --layers --destination extracted && \
    mv extracted/application/*.jar extracted/application/application.jar

# ---- Runtime Stage ----
FROM eclipse-temurin:25-jre-alpine

RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/extracted/dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=appuser:appgroup /app/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /app/extracted/application/ ./

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8081

# JVM đọc JAVA_TOOL_OPTIONS lúc khởi động nên có thể override khi chạy container
ENV TZ=Asia/Ho_Chi_Minh
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

# Healthcheck do docker-compose (wget) và Kubernetes probe đảm nhận
ENTRYPOINT ["java", "-Duser.timezone=Asia/Ho_Chi_Minh", "-jar", "application.jar"]
