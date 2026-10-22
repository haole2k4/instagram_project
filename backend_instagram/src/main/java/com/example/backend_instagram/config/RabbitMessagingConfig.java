package com.example.backend_instagram.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.JacksonJavaTypeMapper;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.amqp.autoconfigure.RabbitTemplateCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/**
 * Topology cho các tác vụ bất đồng bộ.
 *
 * <p>Notification được ghi vào DB trước, message chỉ dùng để đẩy realtime.
 * Vì vậy queue là quorum + durable, còn DLQ giữ message lỗi để điều tra.</p>
 */
@Configuration
@EnableRabbit
@ConditionalOnProperty(name = "app.messaging.enabled", havingValue = "true", matchIfMissing = true)
public class RabbitMessagingConfig {

    private static final Logger log = LoggerFactory.getLogger(RabbitMessagingConfig.class);

    public static final String EXCHANGE = "instagram.events";
    public static final String NOTIFICATION_QUEUE = "notification.dispatch";
    public static final String NOTIFICATION_ROUTING_KEY = "notification.created";
    public static final String DEAD_LETTER_EXCHANGE = "instagram.dlx";
    public static final String NOTIFICATION_DLQ = "notification.dlq";

    @Bean
    public DirectExchange instagramEventsExchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange instagramDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(NOTIFICATION_QUEUE)
                .quorum()
                .deadLetterExchange(DEAD_LETTER_EXCHANGE)
                .deadLetterRoutingKey(NOTIFICATION_DLQ)
                .build();
    }

    @Bean
    public Queue notificationDeadLetterQueue() {
        return QueueBuilder.durable(NOTIFICATION_DLQ).quorum().build();
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, DirectExchange instagramEventsExchange) {
        return BindingBuilder.bind(notificationQueue)
                .to(instagramEventsExchange)
                .with(NOTIFICATION_ROUTING_KEY);
    }

    @Bean
    public Binding notificationDeadLetterBinding(Queue notificationDeadLetterQueue,
            DirectExchange instagramDeadLetterExchange) {
        return BindingBuilder.bind(notificationDeadLetterQueue)
                .to(instagramDeadLetterExchange)
                .with(NOTIFICATION_DLQ);
    }

    @Bean
    public MessageConverter rabbitMessageConverter(JsonMapper jsonMapper) {
        JacksonJsonMessageConverter converter = new JacksonJsonMessageConverter(jsonMapper);
        // Consumer luôn dùng kiểu tham số của listener, không tin type header từ message.
        converter.setTypePrecedence(JacksonJavaTypeMapper.TypePrecedence.INFERRED);
        converter.setAlwaysConvertToInferredType(true);
        return converter;
    }

    @Bean
    public RabbitTemplateCustomizer rabbitTemplateCustomizer() {
        return template -> template.setReturnsCallback(returned -> log.warn(
                "Message không được route: exchange={}, routingKey={}, replyCode={}, replyText={}",
                returned.getExchange(),
                returned.getRoutingKey(),
                returned.getReplyCode(),
                returned.getReplyText()));
    }
}
