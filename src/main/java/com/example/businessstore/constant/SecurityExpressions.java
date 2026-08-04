package com.example.businessstore.constant;

public final class SecurityExpressions {

    public static final String CAN_VIEW_DASHBOARD = "hasAuthority('DASHBOARD_VIEW')";
    public static final String CAN_MANAGE_USERS = "hasAuthority('USER_MANAGE')";
    public static final String CAN_MANAGE_CATEGORIES = "hasAuthority('CATEGORY_MANAGE')";
    public static final String CAN_MANAGE_PRODUCTS = "hasAuthority('PRODUCT_MANAGE')";
    public static final String CAN_MANAGE_FRAMES = "hasAuthority('FRAME_MANAGE')";
    public static final String CAN_MANAGE_ORDERS = "hasAuthority('ORDER_MANAGE')";
    public static final String CAN_MANAGE_PAYMENTS = "hasAuthority('PAYMENT_MANAGE')";
    public static final String CAN_MANAGE_CUSTOM_ORDERS = "hasAuthority('CUSTOM_ORDER_MANAGE')";
    public static final String CAN_MANAGE_SHIPMENTS = "hasAuthority('SHIPMENT_MANAGE')";
    public static final String CAN_VIEW_ORDER_SHIPMENT = "hasAnyAuthority('SHIPMENT_MANAGE', 'ORDER_MANAGE')";
    public static final String CAN_MANAGE_PROMOTIONS = "hasAuthority('PROMOTION_MANAGE')";

    private SecurityExpressions() {
    }
}
