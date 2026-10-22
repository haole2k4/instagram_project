package com.example.backend_instagram.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.backend_instagram.config.RabbitMessagingConfig;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

@Testcontainers
@SpringBootTest(properties = "app.messaging.enabled=true")
@Import(NotificationRetryDlqTest.RetryTestConfig.class)
class NotificationRetryDlqTest {

    private static final String RETRY_QUEUE = "notification.test.retry";
    private static final String RETRY_ROUTING_KEY = "notification.test.retry";

    @Container
    static final RabbitMQContainer RABBITMQ = new RabbitMQContainer("rabbitmq:4.4-management-alpine");

    static {
        RABBITMQ.start();
    }

    @DynamicPropertySource
    static void rabbitProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", RABBITMQ::getHost);
        registry.add("spring.rabbitmq.port", RABBITMQ::getAmqpPort);
        registry.add("spring.rabbitmq.username", () -> "guest");
        registry.add("spring.rabbitmq.password", () -> "guest");
        registry.add("spring.rabbitmq.virtual-host", () -> "/");
        // Rút ngắn backoff để test không phải chờ 1s + 2s + 4s.
        registry.add("spring.rabbitmq.listener.simple.retry.initial-interval", () -> "100ms");
    }

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private RabbitAdmin rabbitAdmin;

    @BeforeEach
    void purgeDlq() {
        rabbitAdmin.purgeQueue(RabbitMessagingConfig.NOTIFICATION_DLQ, false);
    }

    @Test
    void listenerFailureIsRetriedThenDeadLettered() {
        rabbitTemplate.convertAndSend(
                RabbitMessagingConfig.EXCHANGE,
                RETRY_ROUTING_KEY,
                new TestMessage("poison"));

        Message dead = rabbitTemplate.receive(RabbitMessagingConfig.NOTIFICATION_DLQ, 15_000);

        assertThat(dead).isNotNull();
        assertThat(new String(dead.getBody(), StandardCharsets.UTF_8)).contains("poison");
        assertThat(dead.getMessageProperties().getHeaders()).containsKey("x-death");
    }

    @Test
    void malformedMessageIsDeadLetteredInsteadOfBlockingTheQueue() {
        MessageProperties properties = new MessageProperties();
        properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        Message malformed = new Message("not-json".getBytes(StandardCharsets.UTF_8), properties);

        rabbitTemplate.send(
                RabbitMessagingConfig.EXCHANGE,
                RabbitMessagingConfig.NOTIFICATION_ROUTING_KEY,
                malformed);

        Message dead = rabbitTemplate.receive(RabbitMessagingConfig.NOTIFICATION_DLQ, 15_000);

        assertThat(dead).isNotNull();
        assertThat(new String(dead.getBody(), StandardCharsets.UTF_8)).isEqualTo("not-json");
        assertThat(dead.getMessageProperties().getHeaders()).containsKey("x-death");
    }

    record TestMessage(String value) {
    }

    static class FailingListener {
        @RabbitListener(queues = RETRY_QUEUE)
        public void onMessage(TestMessage message) {
            throw new IllegalStateException("boom: " + message.value());
        }
    }

    @TestConfiguration
    static class RetryTestConfig {

        @Bean
        Queue retryQueue() {
            return QueueBuilder.durable(RETRY_QUEUE)
                    .quorum()
                    .deadLetterExchange(RabbitMessagingConfig.DEAD_LETTER_EXCHANGE)
                    .deadLetterRoutingKey(RabbitMessagingConfig.NOTIFICATION_DLQ)
                    .build();
        }

        @Bean
        Binding retryBinding(Queue retryQueue, DirectExchange instagramEventsExchange) {
            return BindingBuilder.bind(retryQueue)
                    .to(instagramEventsExchange)
                    .with(RETRY_ROUTING_KEY);
        }

        @Bean
        FailingListener failingListener() {
            return new FailingListener();
        }
    }
}
