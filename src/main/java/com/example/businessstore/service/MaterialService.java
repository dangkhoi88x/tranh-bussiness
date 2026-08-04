package com.example.businessstore.service;

import com.example.businessstore.constant.MaterialScope;
import com.example.businessstore.dto.request.CreateMaterialRequest;
import com.example.businessstore.dto.request.UpdateMaterialRequest;
import com.example.businessstore.dto.response.MaterialResponse;
import com.example.businessstore.entity.Material;

import java.util.List;
import java.util.UUID;

public interface MaterialService {
    MaterialResponse create(CreateMaterialRequest request);
    MaterialResponse update(UUID id, UpdateMaterialRequest request);
    List<MaterialResponse> findActive(MaterialScope scope);
    List<MaterialResponse> findAllForManagement(MaterialScope scope);
    Material requireActiveArtworkSurface(UUID materialId);
}
