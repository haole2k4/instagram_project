package com.example.backend_instagram.config;

import org.junit.jupiter.api.TestInstance;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Dùng Testcontainers JDBC URL trong application.properties
 * (jdbc:tc:mysql:8.0:///testdb) để MySQL tự khởi động khi context tạo connection.
 * Cách này tránh việc container bị stop giữa các test class dùng chung base class.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class TestcontainersConfiguration {
}
