package com.example.businessstore.service;

import com.example.businessstore.dto.request.CreateFrameRequest;
import com.example.businessstore.dto.request.UpdateFrameRequest;
import com.example.businessstore.dto.response.FrameResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface FrameService {

    FrameResponse create(CreateFrameRequest request);

    List<FrameResponse> findActive();

    FrameResponse findActiveById(UUID id);

    FrameResponse findActiveBySlug(String slug);

    List<FrameResponse> findAllForManagement();

    FrameResponse findForManagement(UUID id);

    FrameResponse update(UUID id, UpdateFrameRequest request);

    FrameResponse uploadImage(UUID id, MultipartFile file);

    void deleteImage(UUID id);

    void delete(UUID id);
}
