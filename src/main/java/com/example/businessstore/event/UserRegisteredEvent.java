package com.example.businessstore.event;

import java.util.UUID;

public record UserRegisteredEvent(UUID userId, String email, String firstName) {
}
