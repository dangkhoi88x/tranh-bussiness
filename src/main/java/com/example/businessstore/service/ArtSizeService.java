package com.example.businessstore.service;
import com.example.businessstore.dto.request.*; import com.example.businessstore.dto.response.ArtSizeResponse; import com.example.businessstore.entity.ArtSize; import java.math.BigDecimal; import java.util.*;
public interface ArtSizeService { List<ArtSizeResponse> findActive(); List<ArtSizeResponse> findAllForManagement(); ArtSizeResponse create(CreateArtSizeRequest request); ArtSizeResponse update(UUID id, UpdateArtSizeRequest request); ArtSize requireActive(UUID id); void validateDimensions(ArtSize size, BigDecimal widthCm, BigDecimal heightCm); }
