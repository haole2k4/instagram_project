# Backend

Backend Spring Boot của Social App. Hướng dẫn chạy Docker Compose, cấu hình và dữ liệu demo nằm trong [README ở thư mục gốc](../README.md).

Có thể chạy riêng backend khi MySQL, LocalStack, Redis và RabbitMQ đã hoạt động (hoặc tắt cache/messaging bằng SPRING_CACHE_TYPE=none MQ_ENABLED=false):

```bash
./mvnw spring-boot:run
```

Cấu hình backend đọc từ biến môi trường; xem [`.env.example`](.env.example). Không đưa secrets thật vào Git.
