package com.example.businessstore.service;
import com.example.businessstore.dto.request.CreateCustomOrderRequest;
import com.example.businessstore.dto.request.DecideCustomOrderQuoteRequest;
import com.example.businessstore.dto.request.QuoteCustomOrderRequest;
import com.example.businessstore.dto.response.CustomOrderRequestResponse;
import com.example.businessstore.dto.response.PageResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
public interface CustomOrderRequestService {
    CustomOrderRequestResponse create(UUID userId, CreateCustomOrderRequest request);
    PageResponse<CustomOrderRequestResponse> getMine(UUID userId, int page, int size);
    CustomOrderRequestResponse getMineById(UUID userId, UUID id);
    CustomOrderRequestResponse uploadImage(UUID userId, UUID id, MultipartFile file);
    PageResponse<CustomOrderRequestResponse> getAll(int page, int size);
    CustomOrderRequestResponse quote(UUID id, QuoteCustomOrderRequest request);
    CustomOrderRequestResponse decideQuote(UUID userId, UUID id, DecideCustomOrderQuoteRequest request);
}
