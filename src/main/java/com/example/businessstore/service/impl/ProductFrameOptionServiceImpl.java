package com.example.businessstore.service.impl;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.CreateProductFrameOptionRequest;
import com.example.businessstore.dto.request.UpdateProductFrameOptionRequest;
import com.example.businessstore.dto.response.ProductFrameOptionResponse;
import com.example.businessstore.entity.Frame;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductFrameOptionMapper;
import com.example.businessstore.repository.FrameRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.service.ProductFrameOptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductFrameOptionServiceImpl implements ProductFrameOptionService {

    private final ProductRepository productRepository;
    private final FrameRepository frameRepository;
    private final ProductFrameOptionRepository productFrameOptionRepository;
    private final ProductFrameOptionMapper productFrameOptionMapper;

    @Override
    @Transactional
    public ProductFrameOptionResponse create(UUID productId, CreateProductFrameOptionRequest request) {
        Product product = getProduct(productId);
        Frame frame = getFrame(request.frameId());
        if (productFrameOptionRepository.existsByProductIdAndFrameId(productId, frame.getId())) {
            throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_ALREADY_EXISTS, "This frame is already available for the product");
        }

        ProductFrameOption option = new ProductFrameOption();
        option.setProduct(product);
        option.setFrame(frame);
        option.setPriceAdjustment(request.priceAdjustment() == null ? frame.getPriceAdjustment() : request.priceAdjustment());
        option.setAvailable(request.available() == null || request.available());
        return productFrameOptionMapper.toResponse(productFrameOptionRepository.save(option));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductFrameOptionResponse> findPublishedByProductId(UUID productId) {
        productRepository.findById(productId)
                .filter(product -> product.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
        return productFrameOptionRepository
                .findAllByProductIdAndAvailableTrueAndFrameStatusOrderByPriceAdjustmentAsc(productId, FrameStatus.ACTIVE)
                .stream()
                .map(productFrameOptionMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductFrameOptionResponse> findAllForManagement(UUID productId) {
        getProduct(productId);
        return productFrameOptionRepository.findAllByProductIdOrderByPriceAdjustmentAsc(productId).stream()
                .map(productFrameOptionMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ProductFrameOptionResponse update(UUID productId, UUID optionId, UpdateProductFrameOptionRequest request) {
        getProduct(productId);
        ProductFrameOption option = getOption(productId, optionId);
        if (request.priceAdjustment() != null) option.setPriceAdjustment(request.priceAdjustment());
        if (request.available() != null) option.setAvailable(request.available());
        return productFrameOptionMapper.toResponse(option);
    }

    @Override
    @Transactional
    public void delete(UUID productId, UUID optionId) {
        getProduct(productId);
        productFrameOptionRepository.delete(getOption(productId, optionId));
    }

    private Product getProduct(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
    }

    private Frame getFrame(UUID frameId) {
        return frameRepository.findById(frameId)
                .orElseThrow(() -> new AppException(ErrorCode.FRAME_NOT_FOUND, "Frame not found"));
    }

    private ProductFrameOption getOption(UUID productId, UUID optionId) {
        return productFrameOptionRepository.findByIdAndProductId(optionId, productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_FOUND, "Product frame option not found"));
    }
}
