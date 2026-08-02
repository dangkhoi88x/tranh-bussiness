package com.example.businessstore.constant;

public final class SecurityExpressions {

    public static final String CAN_MANAGE_CATEGORIES = "hasAuthority('CATEGORY_MANAGE')";
    public static final String CAN_MANAGE_PRODUCTS = "hasAuthority('PRODUCT_MANAGE')";
    public static final String CAN_MANAGE_FRAMES = "hasAuthority('FRAME_MANAGE')";

    private SecurityExpressions() {
    }
}
