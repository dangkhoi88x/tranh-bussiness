package com.example.businessstore.controller;

import com.example.businessstore.constant.MaterialScope;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreateMaterialRequest;
import com.example.businessstore.dto.request.UpdateMaterialRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.MaterialResponse;
import com.example.businessstore.service.MaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/materials") @RequiredArgsConstructor
public class MaterialController {
    private final MaterialService materialService;
    @GetMapping public ResponseEntity<ApiResponse<List<MaterialResponse>>> findActive(@RequestParam(defaultValue = "ARTWORK_SURFACE") MaterialScope scope) { return ResponseEntity.ok(ApiResponse.success(materialService.findActive(scope))); }
    @GetMapping("/management") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<ApiResponse<List<MaterialResponse>>> findAll(@RequestParam(defaultValue = "ARTWORK_SURFACE") MaterialScope scope) { return ResponseEntity.ok(ApiResponse.success(materialService.findAllForManagement(scope))); }
    @PostMapping @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<ApiResponse<MaterialResponse>> create(@Valid @RequestBody CreateMaterialRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(materialService.create(request), "Đã tạo chất liệu.")); }
    @PutMapping("/{id}") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<ApiResponse<MaterialResponse>> update(@PathVariable UUID id, @Valid @RequestBody UpdateMaterialRequest request) { return ResponseEntity.ok(ApiResponse.success(materialService.update(id, request), "Đã cập nhật chất liệu.")); }
}
