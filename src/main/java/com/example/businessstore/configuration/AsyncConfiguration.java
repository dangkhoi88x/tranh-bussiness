package com.example.businessstore.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfiguration {

    /**
     * Gửi mail SMTP mất hàng giây và đôi khi treo tới lúc timeout. Trước đây việc đó nằm
     * ngay trong luồng xử lý request, nên một máy chủ mail chậm sẽ giữ luôn thread của
     * Tomcat — vừa làm người dùng chờ, vừa là cách hạ gục server rẻ tiền qua /password/forgot.
     *
     * <p>Hàng đợi có giới hạn và cố ý không dùng CallerRunsPolicy: khi quá tải thì thà bỏ
     * thư và ghi log còn hơn đẩy ngược độ trễ SMTP về lại thread request.
     */
    @Bean("mailExecutor")
    ThreadPoolTaskExecutor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("mail-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(15);
        executor.initialize();
        return executor;
    }
}
