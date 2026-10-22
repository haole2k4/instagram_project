package com.example.backend_instagram.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.backend_instagram.config.RabbitMessagingConfig;
import java.time.Duration;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.rabbitmq.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "app.messaging.enabled=true")
@Testcontainers
@Import(RabbitMessagingFoundationTest.ListenerConfig.class)
class RabbitMessagingFoundationTest {

    private static final String TEST_QUEUE = "notification.test.foundation";
    private static final String TEST_ROUTING_KEY = "notification.test.foundation";

    @Container
    static final RabbitMQContainer RABBITMQ = new RabbitMQContainer("rabbitmq:4.4-management-alpine");

    @DynamicPropertySource
    static void rabbitProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", RABBITMQ::getHost);
        registry.add("spring.rabbitmq.port", RABBITMQ::getAmqpPort);
        registry.add("spring.rabbitmq.username", () -> "guest");
        registry.add("spring.rabbitmq.password", () -> "guest");
        registry.add("spring.rabbitmq.virtual-host", () -> "/");
    }

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private TestNotificationListener listener;

    @Test
    void publishesAndConsumesThroughExchange() throws Exception {
        TestMessage message = new TestMessage("hello-mq");

        rabbitTemplate.convertAndSend(
                RabbitMessagingConfig.EXCHANGE,
                TEST_ROUTING_KEY,
                message);

        TestMessage received = listener.received.poll(Duration.ofSeconds(10).toMillis(), TimeUnit.MILLISECONDS);

        assertThat(received).isEqualTo(message);
    }

    record TestMessage(String value) {
    }

    static class TestNotificationListener {
        private final BlockingQueue<TestMessage> received = new LinkedBlockingQueue<>();

        @RabbitListener(queues = TEST_QUEUE)
        public void onMessage(TestMessage message) {
            received.add(message);
        }
    }

    @TestConfiguration
    static class ListenerConfig {
        @Bean
        TestNotificationListener testNotificationListener() {
            return new TestNotificationListener();
        }

        @Bean
        Queue foundationQueue() {
            return QueueBuilder.durable(TEST_QUEUE).build();
        }

        @Bean
        Binding foundationBinding(Queue foundationQueue, DirectExchange instagramEventsExchange) {
            return BindingBuilder.bind(foundationQueue)
                    .to(instagramEventsExchange)
                    .with(TEST_ROUTING_KEY);
        }
    }
}
