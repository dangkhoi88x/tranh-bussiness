package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Size;

public record UploadPhotobookProofRequest(@Size(max = 2000) String staffNote) {
}
