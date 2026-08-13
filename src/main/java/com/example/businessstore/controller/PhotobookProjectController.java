package com.example.businessstore.controller;

import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.AssignSlotPhotoRequest;
import com.example.businessstore.dto.request.ChangeSpreadLayoutRequest;
import com.example.businessstore.dto.request.DecidePhotobookProofRequest;
import com.example.businessstore.dto.request.SubmitPhotobookPhotosRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PhotobookArrangementResponse;
import com.example.businessstore.dto.response.PhotobookProjectResponse;
import com.example.businessstore.service.PhotobookArrangementService;
import com.example.businessstore.service.PhotobookProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/photobook-projects")
@RequiredArgsConstructor
public class PhotobookProjectController {

    private final PhotobookProjectService photobookProjectService;
    private final PhotobookArrangementService photobookArrangementService;

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<PageResponse<PhotobookProjectResponse>>> mine(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(photobookProjectService.getMine(userId(jwt), page, size)));
    }

    @GetMapping("/mine/{id}")
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> mineById(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(photobookProjectService.getMineById(userId(jwt), id)));
    }

    @PostMapping(value = "/mine/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> addPhoto(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookProjectService.addPhoto(userId(jwt), id, file), "Đã tải ảnh lên."));
    }

    @DeleteMapping("/mine/{id}/photos/{photoId}")
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> removePhoto(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID photoId) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookProjectService.removePhoto(userId(jwt), id, photoId), "Đã xoá ảnh."));
    }

    @PostMapping("/mine/{id}/submit")
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> submit(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody SubmitPhotobookPhotosRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookProjectService.submit(userId(jwt), id, request.customerNote()),
                "Đã gửi ảnh cho xưởng."));
    }

    /** Khách duyệt bản mềm mới nhất, hoặc yêu cầu sửa kèm ghi chú. */
    @PostMapping("/mine/{id}/proof-decision")
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> decideProof(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody DecidePhotobookProofRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookProjectService.decideProof(userId(jwt), id, request.approved(), request.customerNote()),
                request.approved() ? "Proof approved" : "Revision requested"));
    }

    /* ── Storyboard (bản nháp sắp xếp) ── */

    @GetMapping("/mine/{id}/arrangement")
    public ResponseEntity<ApiResponse<PhotobookArrangementResponse>> arrangement(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(photobookArrangementService.getArrangement(userId(jwt), id)));
    }

    @PutMapping("/mine/{id}/spreads/{spreadId}/layout")
    public ResponseEntity<ApiResponse<PhotobookArrangementResponse>> changeSpreadLayout(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID spreadId,
            @Valid @RequestBody ChangeSpreadLayoutRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookArrangementService.changeSpreadLayout(userId(jwt), id, spreadId, request.layoutCode()),
                "Đã đổi bố cục trang đôi."));
    }

    @PutMapping("/mine/{id}/slots/{slotId}/photo")
    public ResponseEntity<ApiResponse<PhotobookArrangementResponse>> assignPhoto(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID slotId,
            @RequestBody AssignSlotPhotoRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookArrangementService.assignPhoto(userId(jwt), id, slotId, request.photoId()),
                "Đã cập nhật ô ảnh."));
    }

    /* ── Phía xưởng ── */

    @GetMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_CUSTOM_ORDERS)
    public ResponseEntity<ApiResponse<PageResponse<PhotobookProjectResponse>>> all(
            @RequestParam(required = false) PhotobookProjectStatus status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(photobookProjectService.getForManagement(status, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_CUSTOM_ORDERS)
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> byId(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(photobookProjectService.getForManagementById(id)));
    }

    @PostMapping(value = "/{id}/proofs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_CUSTOM_ORDERS)
    public ResponseEntity<ApiResponse<PhotobookProjectResponse>> uploadProof(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "staffNote", required = false) String staffNote) {
        return ResponseEntity.ok(ApiResponse.success(
                photobookProjectService.uploadProof(id, file, staffNote), "Đã gửi bản mềm cho khách."));
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
