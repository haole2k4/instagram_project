package com.example.backend_instagram.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Executor riêng cho việc publish message.
 *
 * <p>Publish chạy sau commit và không được làm chậm request. Khi executor đầy,
 * event bị bỏ và ghi log; notification vẫn còn trong DB để client đọc qua REST.</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    public static final String MESSAGING_EXECUTOR = "messagingExecutor";

    @Bean(name = MESSAGING_EXECUTOR)
    public ThreadPoolTaskExecutor messagingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("mq-publish-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(5);
        executor.setRejectedExecutionHandler((task, pool) -> log.warn(
                "Bỏ qua event publish vì executor đầy (active={}, queue={}); notification vẫn còn trong DB",
                pool.getActiveCount(), pool.getQueue().size()));
        executor.initialize();
        return executor;
    }
}
