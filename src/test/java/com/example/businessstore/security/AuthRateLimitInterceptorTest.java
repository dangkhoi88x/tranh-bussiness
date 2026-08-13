package com.example.businessstore.security;

import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthRateLimitInterceptorTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;

    private AuthRateLimitInterceptor interceptor;
    private MockHttpServletResponse response;

    private static final AuthRateLimitProperties.Rule THREE_PER_MINUTE =
            new AuthRateLimitProperties.Rule(3, Duration.ofMinutes(1));

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        interceptor = new AuthRateLimitInterceptor(redisTemplate, new AuthRateLimitProperties(
                true, THREE_PER_MINUTE, THREE_PER_MINUTE, THREE_PER_MINUTE, THREE_PER_MINUTE));
        response = new MockHttpServletResponse();
    }

    private MockHttpServletRequest requestTo(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.setRemoteAddr("203.0.113.7");
        return request;
    }

    @Test
    void letsRequestsThroughWhileUnderTheLimit() {
        when(valueOperations.increment(anyString())).thenReturn(3L);

        assertThat(interceptor.preHandle(requestTo("/api/v1/auth/login"), response, null)).isTrue();
    }

    @Test
    void setsTheWindowOnlyOnTheFirstRequest() {
        when(valueOperations.increment(anyString())).thenReturn(1L);
        interceptor.preHandle(requestTo("/api/v1/auth/login"), response, null);
        verify(redisTemplate).expire("auth-rate:login:203.0.113.7", Duration.ofMinutes(1));

        when(valueOperations.increment(anyString())).thenReturn(2L);
        interceptor.preHandle(requestTo("/api/v1/auth/login"), response, null);
        verify(redisTemplate, never()).expire(anyString(), eq(Duration.ofMinutes(1).plusSeconds(1)));
    }

    @Test
    void rejectsTheRequestAfterTheLimitAndSaysWhenToRetry() {
        when(valueOperations.increment(anyString())).thenReturn(4L);
        when(redisTemplate.getExpire(anyString(), any(TimeUnit.class))).thenReturn(42L);

        MockHttpServletRequest request = requestTo("/api/v1/auth/login");
        assertThatThrownBy(() -> interceptor.preHandle(request, response, null))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("42 giây")
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.TOO_MANY_REQUESTS);

        assertThat(response.getHeader(HttpHeaders.RETRY_AFTER)).isEqualTo("42");
    }

    @Test
    void countsEachEndpointGroupSeparately() {
        when(valueOperations.increment(anyString())).thenReturn(1L);

        interceptor.preHandle(requestTo("/api/v1/auth/login"), response, null);
        interceptor.preHandle(requestTo("/api/v1/auth/password/forgot"), response, null);

        verify(valueOperations).increment("auth-rate:login:203.0.113.7");
        verify(valueOperations).increment("auth-rate:password-forgot:203.0.113.7");
    }

    @Test
    void googleSignInSharesTheLoginBudget() {
        when(valueOperations.increment(anyString())).thenReturn(1L);

        interceptor.preHandle(requestTo("/api/v1/auth/google"), response, null);

        verify(valueOperations).increment("auth-rate:login:203.0.113.7");
    }

    @Test
    void neverLimitsRefreshOrLogout() {
        assertThat(interceptor.preHandle(requestTo("/api/v1/auth/refresh"), response, null)).isTrue();
        assertThat(interceptor.preHandle(requestTo("/api/v1/auth/logout"), response, null)).isTrue();

        verify(valueOperations, never()).increment(anyString());
    }

    @Test
    void failsOpenWhenRedisIsUnreachable() {
        when(valueOperations.increment(anyString())).thenThrow(new RedisConnectionFailureException("down"));

        assertThat(interceptor.preHandle(requestTo("/api/v1/auth/login"), response, null)).isTrue();
    }

    @Test
    void doesNothingWhenTheLimiterIsDisabled() {
        AuthRateLimitInterceptor disabled = new AuthRateLimitInterceptor(redisTemplate,
                new AuthRateLimitProperties(false, THREE_PER_MINUTE, THREE_PER_MINUTE, THREE_PER_MINUTE, THREE_PER_MINUTE));

        assertThat(disabled.preHandle(requestTo("/api/v1/auth/login"), response, null)).isTrue();
        verify(valueOperations, never()).increment(anyString());
    }
}
