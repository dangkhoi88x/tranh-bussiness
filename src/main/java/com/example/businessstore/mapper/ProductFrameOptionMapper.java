package com.example.businessstore.mapper;

import com.example.businessstore.dto.response.ProductFrameOptionResponse;
import com.example.businessstore.entity.ProductFrameOption;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProductFrameOptionMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "frameId", source = "frame.id")
    @Mapping(target = "frameName", source = "frame.name")
    @Mapping(target = "frameMaterial", source = "frame.material")
    @Mapping(target = "frameColor", source = "frame.color")
    @Mapping(target = "frameImageUrl", source = "frame.imageUrl")
    ProductFrameOptionResponse toResponse(ProductFrameOption productFrameOption);
}
