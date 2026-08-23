package com.example.businessstore.dto.response;

import java.util.List;

public record PhotobookLayoutResponse(String code, String name, List<PhotobookSlotDef> slots) {
}
