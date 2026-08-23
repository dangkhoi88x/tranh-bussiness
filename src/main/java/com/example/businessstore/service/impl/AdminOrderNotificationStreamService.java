package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.AdminNewOrderNotificationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Keeps SSE connections local to this instance; Redis delivers the same event to every instance. */
@Slf4j
@Service
public class AdminOrderNotificationStreamService {

    private static final long NO_TIMEOUT = 0L;
    private final Set<SseEmitter> emitters = ConcurrentHashMap.newKeySet();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(NO_TIMEOUT);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(ignored -> emitters.remove(emitter));
        emitters.add(emitter);
        send(emitter, SseEmitter.event().name("connected").data("ok"));
        return emitter;
    }

    public void broadcast(AdminNewOrderNotificationResponse notification) {
        emitters.forEach(emitter -> send(emitter, SseEmitter.event().name("new-order").data(notification)));
    }

    @Scheduled(fixedDelayString = "${app.admin-order-notifications.keepalive-ms:25000}")
    void keepAlive() {
        emitters.forEach(emitter -> send(emitter, SseEmitter.event().comment("keepalive")));
    }

    private void send(SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException exception) {
            emitters.remove(emitter);
            emitter.complete();
            log.debug("Closed inactive admin order-notification SSE connection", exception);
        }
    }
}
