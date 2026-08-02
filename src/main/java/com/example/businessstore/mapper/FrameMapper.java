package com.example.businessstore.mapper;

import com.example.businessstore.dto.response.FrameResponse;
import com.example.businessstore.entity.Frame;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FrameMapper {

    FrameResponse toResponse(Frame frame);
}
