package com.example.businessstore.service.impl;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.ShippingAddressResponse;
import com.example.businessstore.entity.ShippingAddress;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.*;
import com.example.businessstore.repository.*;
import com.example.businessstore.service.ShippingAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor
public class ShippingAddressServiceImpl implements ShippingAddressService {
    private final ShippingAddressRepository addressRepository; private final UserRepository userRepository;
    @Override @Transactional public ShippingAddressResponse create(UUID userId, CreateShippingAddressRequest input) { boolean makeDefault = Boolean.TRUE.equals(input.defaultAddress()) || !addressRepository.existsByUserId(userId); if (makeDefault) addressRepository.clearDefaultByUserId(userId); ShippingAddress address = new ShippingAddress(); address.setUser(user(userId)); apply(address, input.recipientName(), input.phone(), input.province(), input.district(), input.ward(), input.addressLine()); address.setDefaultAddress(makeDefault); return toResponse(addressRepository.save(address)); }
    @Override @Transactional(readOnly = true) public List<ShippingAddressResponse> getMine(UUID userId) { return addressRepository.findAllByUserIdOrderByDefaultAddressDescCreatedAtDesc(userId).stream().map(this::toResponse).toList(); }
    @Override @Transactional public ShippingAddressResponse update(UUID userId, UUID id, UpdateShippingAddressRequest input) { ShippingAddress address = getOwned(userId, id); if (Boolean.TRUE.equals(input.defaultAddress())) { addressRepository.clearDefaultByUserId(userId); address.setDefaultAddress(true); } apply(address, input.recipientName(), input.phone(), input.province(), input.district(), input.ward(), input.addressLine()); return toResponse(address); }
    @Override @Transactional public void delete(UUID userId, UUID id) { addressRepository.delete(getOwned(userId, id)); }
    @Override @Transactional(readOnly = true) public ShippingAddress getOwned(UUID userId, UUID id) { return addressRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new AppException(ErrorCode.SHIPPING_ADDRESS_NOT_FOUND, "Shipping address not found")); }
    private User user(UUID id) { return userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "User not found")); }
    private void apply(ShippingAddress a, String name, String phone, String province, String district, String ward, String line) { a.setRecipientName(name.trim()); a.setPhone(phone.trim()); a.setProvince(province.trim()); a.setDistrict(district.trim()); a.setWard(ward.trim()); a.setAddressLine(line.trim()); }
    private ShippingAddressResponse toResponse(ShippingAddress a) { return new ShippingAddressResponse(a.getId(), a.getRecipientName(), a.getPhone(), a.getProvince(), a.getDistrict(), a.getWard(), a.getAddressLine(), a.isDefaultAddress()); }
}
