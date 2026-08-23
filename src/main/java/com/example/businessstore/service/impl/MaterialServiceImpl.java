package com.example.businessstore.service.impl;

import com.example.businessstore.constant.MaterialScope;
import com.example.businessstore.constant.MaterialStatus;
import com.example.businessstore.dto.request.CreateMaterialRequest;
import com.example.businessstore.dto.request.UpdateMaterialRequest;
import com.example.businessstore.dto.response.MaterialResponse;
import com.example.businessstore.entity.Material;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.MaterialRepository;
import com.example.businessstore.service.MaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MaterialServiceImpl implements MaterialService {
    private final MaterialRepository materialRepository;

    @Override @Transactional
    public MaterialResponse create(CreateMaterialRequest request) {
        String code = normalizeCode(request.code());
        if (materialRepository.existsByCodeIgnoreCase(code)) throw new AppException(ErrorCode.MATERIAL_CODE_ALREADY_EXISTS, "Mã chất liệu này đã tồn tại.");
        Material material = new Material();
        material.setCode(code); material.setName(normalizeName(request.name())); material.setScope(request.scope());
        material.setStatus(MaterialStatus.ACTIVE);
        material.setDescription(normalizeDescription(request.description()));
        return response(materialRepository.save(material));
    }

    @Override @Transactional
    public MaterialResponse update(UUID id, UpdateMaterialRequest request) {
        Material material = get(id);
        if (request.code() != null) { String code = normalizeCode(request.code()); if (materialRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) throw new AppException(ErrorCode.MATERIAL_CODE_ALREADY_EXISTS, "Mã chất liệu này đã tồn tại."); material.setCode(code); }
        if (request.name() != null) material.setName(normalizeName(request.name()));
        if (request.status() != null) material.setStatus(request.status());
        if (request.description() != null) material.setDescription(normalizeDescription(request.description()));
        return response(material);
    }

    @Override @Transactional(readOnly = true)
    public List<MaterialResponse> findActive(MaterialScope scope) { return materialRepository.findAllByScopeAndStatusOrderByNameAsc(scope, MaterialStatus.ACTIVE).stream().map(this::response).toList(); }

    @Override @Transactional(readOnly = true)
    public List<MaterialResponse> findAllForManagement(MaterialScope scope) { return materialRepository.findAllByScopeOrderByNameAsc(scope).stream().map(this::response).toList(); }

    @Override @Transactional(readOnly = true)
    public Material requireActiveArtworkSurface(UUID materialId) { return materialRepository.findByIdAndScopeAndStatus(materialId, MaterialScope.ARTWORK_SURFACE, MaterialStatus.ACTIVE).orElseThrow(() -> new AppException(ErrorCode.MATERIAL_NOT_ACTIVE, "Hãy chọn một chất liệu đang được dùng.")); }

    private Material get(UUID id) { return materialRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.MATERIAL_NOT_FOUND, "Không tìm thấy chất liệu.")); }
    private MaterialResponse response(Material item) { return new MaterialResponse(item.getId(), item.getCode(), item.getName(), item.getScope(), item.getStatus(), item.getDescription()); }
    private String normalizeCode(String value) { String code = value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", ""); if (code.isBlank()) throw new AppException(ErrorCode.INVALID_MATERIAL, "Mã chất liệu phải có chữ hoặc số."); return code; }
    private String normalizeName(String value) { return value.trim().replaceAll("\\s+", " "); }
    private String normalizeDescription(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
