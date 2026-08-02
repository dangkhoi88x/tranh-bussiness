package com.example.businessstore.constant;

public final class SecurityExpressions {

    public static final String CAN_MANAGE_CATEGORIES = "hasAuthority('CATEGORY_MANAGE')";
    public static final String CAN_MANAGE_PRODUCTS = "hasAuthority('PRODUCT_MANAGE')";
    public static final String CAN_MANAGE_FRAMES = "hasAuthority('FRAME_MANAGE')";
    public static final String CAN_MANAGE_ORDERS = "hasAuthority('ORDER_MANAGE')";
    public static final String CAN_MANAGE_PAYMENTS = "hasAuthority('PAYMENT_MANAGE')";
    public static final String CAN_MANAGE_CUSTOM_ORDERS = "hasAuthority('CUSTOM_ORDER_MANAGE')";
    public static final String CAN_MANAGE_SHIPMENTS = "hasAuthority('SHIPMENT_MANAGE')";

    private SecurityExpressions() {
    }
}
