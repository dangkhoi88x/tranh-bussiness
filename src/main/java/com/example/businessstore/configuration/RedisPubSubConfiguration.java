package com.example.businessstore.configuration;

import com.example.businessstore.service.impl.AdminOrderNotificationPublisher;
import com.example.businessstore.service.impl.RedisAdminOrderNotificationSubscriber;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
public class RedisPubSubConfiguration {

    private final RedisAdminOrderNotificationSubscriber adminOrderNotificationSubscriber;

    @Bean
    RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(adminOrderNotificationSubscriber, new ChannelTopic(AdminOrderNotificationPublisher.CHANNEL));
        return container;
    }
}
