package com.example.businessstore.dto.response;

import com.example.businessstore.constant.MaterialScope;
import com.example.businessstore.constant.MaterialStatus;
import java.util.UUID;

public record MaterialResponse(UUID id, String code, String name, MaterialScope scope,
                               MaterialStatus status, String description) {
}
