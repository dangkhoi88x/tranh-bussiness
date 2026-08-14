package com.example.businessstore;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.ProductCatalogSort;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.constant.ProductStockLevel;
import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.constant.PermissionName;
import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.dto.request.ProductCatalogFilter;
import com.example.businessstore.dto.request.UpdateRolePermissionsRequest;
import com.example.businessstore.service.UserManagementService;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.User;
import com.example.businessstore.entity.WishlistItem;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.NotificationRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.ShipmentRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.repository.WishlistItemRepository;
import com.example.businessstore.service.DashboardService;
import com.example.businessstore.service.ProductService;
import com.example.businessstore.repository.specification.ProductCatalogSpecifications;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class BusinessStoreApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired PromotionRepository promotionRepository;
    @Autowired ShipmentRepository shipmentRepository;
    @Autowired UserRepository userRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired ProductRepository productRepository;
    @Autowired ProductVariantRepository productVariantRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired DashboardService dashboardService;
    @Autowired ProductService productService;
    @Autowired NotificationRepository notificationRepository;
    @Autowired WishlistItemRepository wishlistItemRepository;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired UserManagementService userManagementService;

    @Test
    void contextLoads() {
    }

    @Test
    void managementSearchesAcceptEmptyOptionalTextFiltersOnPostgres() {
        PageRequest page = PageRequest.of(0, 20);

        assertThat(promotionRepository.searchForManagement(null, null, null, null, page).getContent()).isNotNull();
        assertThat(promotionRepository.searchForManagement("no-match", null, null, null, page).getContent()).isEmpty();
        assertThat(shipmentRepository.searchForManagement(null, null, null, page).getContent()).isNotNull();
        assertThat(paymentRepository.searchForManagement(null, null, Instant.EPOCH,
                Instant.parse("9999-12-31T23:59:59.999999Z"), page).getContent()).isNotNull();
        assertThat(orderRepository.searchForManagement(null, null, null, Instant.EPOCH,
                Instant.parse("9999-12-31T23:59:59.999999Z"), page).getContent()).isNotNull();
    }

    @Test
    void atomicQuotaReservation_allowsOnlyOneWinnerForLastSlot() throws Exception {
        Promotion promotion = new Promotion();
        promotion.setName("Last slot"); promotion.setCode("LAST-" + System.nanoTime());
        promotion.setType(PromotionType.FIXED_AMOUNT); promotion.setDiscountValue(BigDecimal.ONE);
        promotion.setMinOrderAmount(BigDecimal.ZERO); promotion.setStartAt(Instant.now().minusSeconds(60));
        promotion.setEndAt(Instant.now().plusSeconds(3600)); promotion.setUsageLimit(1);
        promotion.setReservedCount(0); promotion.setUsedCount(0); promotion.setPerUserLimit(1);
        promotion.setAppliesToAll(true);
        promotion.setStatus(PromotionStatus.ACTIVE);
        Promotion saved = promotionRepository.saveAndFlush(promotion);

        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                start.await();
                return transactions.execute(status -> promotionRepository.reserveQuota(saved.getId(), Instant.now()));
            });
            var second = executor.submit(() -> {
                start.await();
                return transactions.execute(status -> promotionRepository.reserveQuota(saved.getId(), Instant.now()));
            });
            start.countDown();
            assertThat(first.get() + second.get()).isEqualTo(1);
        }

        assertThat(promotionRepository.findById(saved.getId()).orElseThrow().getReservedCount()).isEqualTo(1);
    }

    @Test
    void wishlistPartialUniqueIndex_blocksDuplicateGenericProductForOneUser() {
        User user = new User();
        user.setEmail("wishlist-" + System.nanoTime() + "@example.com"); user.setPasswordHash("hash");
        user.setFirstName("Wishlist"); user.setLastName("User");
        User savedUser = userRepository.saveAndFlush(user);

        Category category = new Category();
        category.setName("Wishlist category " + System.nanoTime()); category.setSlug("wishlist-category-" + System.nanoTime());
        Category savedCategory = categoryRepository.saveAndFlush(category);

        Product product = new Product(); product.setCategory(savedCategory); product.setName("Wishlist product");
        product.setSlug("wishlist-product-" + System.nanoTime()); product.setPrice(BigDecimal.TEN);
        product.setStockQuantity(1); product.setStatus(ProductStatus.PUBLISHED);
        Product savedProduct = productRepository.saveAndFlush(product);

        WishlistItem first = new WishlistItem(); first.setUser(savedUser); first.setProduct(savedProduct);
        wishlistItemRepository.saveAndFlush(first);
        WishlistItem duplicate = new WishlistItem(); duplicate.setUser(savedUser); duplicate.setProduct(savedProduct);

        assertThatThrownBy(() -> wishlistItemRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void catalogueFilterUsesOneAvailableVariantAndBestSellingUsesDeliveredOrdersOnly() {
        String suffix = Long.toString(System.nanoTime());
        User user = new User();
        user.setEmail("catalog-" + suffix + "@example.com"); user.setPasswordHash("hash");
        user.setFirstName("Catalog"); user.setLastName("User");
        User savedUser = userRepository.saveAndFlush(user);

        Category category = new Category();
        category.setName("Catalog category " + suffix); category.setSlug("catalog-category-" + suffix);
        Category savedCategory = categoryRepository.saveAndFlush(category);

        Product matchingProduct = savePublishedProduct(savedCategory, "Tranh sơn dầu Canvas 40x60 " + suffix, "canvas-match-" + suffix,
                new BigDecimal("100000"));
        ProductVariant matchingVariant = saveVariant(matchingProduct, "CANVAS-40-" + suffix, "Canvas 40x60",
                "Canvas", new BigDecimal("700000"), new BigDecimal("40"), new BigDecimal("60"));

        Product mixedVariantProduct = savePublishedProduct(savedCategory, "Mixed variants " + suffix, "mixed-" + suffix,
                new BigDecimal("100000"));
        saveVariant(mixedVariantProduct, "CANVAS-LOW-" + suffix, "Canvas 40x60", "Canvas",
                new BigDecimal("500000"), new BigDecimal("40"), new BigDecimal("60"));
        saveVariant(mixedVariantProduct, "CANVAS-HIGH-" + suffix, "Canvas 60x90", "Canvas",
                new BigDecimal("1200000"), new BigDecimal("60"), new BigDecimal("90"));

        Product noVariantProduct = savePublishedProduct(savedCategory, "Base art " + suffix, "base-art-" + suffix,
                new BigDecimal("800000"));
        noVariantProduct.setWidthCm(new BigDecimal("40")); noVariantProduct.setHeightCm(new BigDecimal("60"));
        productRepository.saveAndFlush(noVariantProduct);

        ProductCatalogFilter canvasFortyBySixtyFromSixHundred = new ProductCatalogFilter(
                savedCategory.getId(), "son dau", new BigDecimal("600000"), new BigDecimal("900000"), "canvas",
                new BigDecimal("40"), new BigDecimal("60"), ProductCatalogSort.PRICE_ASC);

        var filtered = productRepository.findAll(
                ProductCatalogSpecifications.published(canvasFortyBySixtyFromSixHundred), PageRequest.of(0, 20));

        assertThat(filtered.getContent()).extracting(Product::getId).containsExactly(matchingProduct.getId());

        saveDeliveredOrder(savedUser, matchingProduct, matchingVariant, suffix);
        ProductCatalogFilter bestSelling = new ProductCatalogFilter(
                savedCategory.getId(), null, null, null, null, null, null, ProductCatalogSort.BEST_SELLING);

        var bestSellingProducts = productRepository.findAll(
                ProductCatalogSpecifications.published(bestSelling), PageRequest.of(0, 20));

        assertThat(bestSellingProducts.getContent()).first().extracting(Product::getId).isEqualTo(matchingProduct.getId());
    }

    @Test
    void notificationEventKeyAllowsOnlyOneDeliveryForRetriedEvent() {
        User user = new User();
        user.setEmail("notification-" + System.nanoTime() + "@example.com"); user.setPasswordHash("hash");
        user.setFirstName("Notification"); user.setLastName("User");
        User savedUser = userRepository.saveAndFlush(user);
        String eventKey = "WELCOME:" + savedUser.getId();

        int first = notificationRepository.insertIfAbsent(UUID.randomUUID(), savedUser.getId(), NotificationType.WELCOME.name(),
                "Welcome", "Message", "/", eventKey);
        int duplicate = notificationRepository.insertIfAbsent(UUID.randomUUID(), savedUser.getId(), NotificationType.WELCOME.name(),
                "Welcome", "Message", "/", eventKey);

        assertThat(first).isEqualTo(1);
        assertThat(duplicate).isZero();
        assertThat(notificationRepository.countByUserIdAndReadAtIsNull(savedUser.getId())).isEqualTo(1);
    }

    @Test
    void dashboardAggregatesPaidRevenueOrdersAndLowStockOnPostgres() {
        String suffix = Long.toString(System.nanoTime());
        User user = new User();
        user.setEmail("dashboard-" + suffix + "@example.com"); user.setPasswordHash("hash");
        user.setFirstName("Dashboard"); user.setLastName("User");
        User savedUser = userRepository.saveAndFlush(user);

        Category category = new Category();
        category.setName("Dashboard category " + suffix); category.setSlug("dashboard-category-" + suffix);
        Category savedCategory = categoryRepository.saveAndFlush(category);
        Product product = savePublishedProduct(savedCategory, "Dashboard product " + suffix, "dashboard-product-" + suffix, new BigDecimal("400000"));
        product.setStockQuantity(1);
        productRepository.saveAndFlush(product);

        Order order = new Order();
        order.setOrderCode("DASH-" + suffix); order.setUser(savedUser); order.setShippingAddress("Test address");
        order.setSubtotalAmount(new BigDecimal("400000")); order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("400000")); order.setStatus(OrderStatus.DELIVERED);
        Order savedOrder = orderRepository.saveAndFlush(order);
        Payment payment = new Payment();
        payment.setOrder(savedOrder); payment.setAmount(new BigDecimal("400000")); payment.setMethod(PaymentMethod.COD);
        payment.setStatus(PaymentStatus.SUCCESS); payment.setTransactionCode("DASH-PAY-" + suffix); payment.setPaidAt(Instant.now());
        paymentRepository.saveAndFlush(payment);

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var dashboard = dashboardService.getOverview(today, today);

        assertThat(dashboard.revenue()).isGreaterThanOrEqualTo(new BigDecimal("400000"));
        assertThat(dashboard.orderCount()).isGreaterThanOrEqualTo(1);
        assertThat(dashboard.orderStatuses()).anySatisfy(status -> {
            assertThat(status.status()).isEqualTo(OrderStatus.DELIVERED);
            assertThat(status.count()).isGreaterThanOrEqualTo(1);
        });
        assertThat(dashboard.lowStockItems()).extracting(item -> item.productId()).contains(product.getId());
    }

    @Test
    void managementStockAndDashboardUseAvailableVariantsInsteadOfParentProductStock() {
        String suffix = Long.toString(System.nanoTime());
        Category category = new Category();
        category.setName("Variant stock category " + suffix); category.setSlug("variant-stock-category-" + suffix);
        Category savedCategory = categoryRepository.saveAndFlush(category);
        Product product = savePublishedProduct(savedCategory, "Variant stock product " + suffix,
                "variant-stock-product-" + suffix, new BigDecimal("900000"));
        product.setStockQuantity(99);
        productRepository.saveAndFlush(product);

        ProductVariant soldOutVariant = new ProductVariant();
        soldOutVariant.setProduct(product); soldOutVariant.setSku("SOLD-OUT-" + suffix);
        soldOutVariant.setName("40 x 60 Canvas"); soldOutVariant.setMaterial("Canvas");
        soldOutVariant.setWidthCm(new BigDecimal("40")); soldOutVariant.setHeightCm(new BigDecimal("60"));
        soldOutVariant.setPrice(new BigDecimal("900000")); soldOutVariant.setStockQuantity(0); soldOutVariant.setAvailable(true);
        productVariantRepository.saveAndFlush(soldOutVariant);

        var management = productService.findAllForManagement(null, null, ProductStatus.PUBLISHED,
                "sold-out-" + suffix, "canvas", ProductStockLevel.OUT_OF_STOCK, null, null, 1, 20);
        assertThat(management.items()).anySatisfy(item -> {
            assertThat(item.id()).isEqualTo(product.getId());
            assertThat(item.effectiveStockQuantity()).isZero();
            assertThat(item.hasVariants()).isTrue();
        });

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        var dashboard = dashboardService.getOverview(today, today);
        assertThat(dashboard.lowStockItems()).anySatisfy(item -> {
            assertThat(item.productId()).isEqualTo(product.getId());
            assertThat(item.variantSku()).isEqualTo(soldOutVariant.getSku());
            assertThat(item.variantName()).isEqualTo("40 x 60 Canvas");
            assertThat(item.material()).isEqualTo("Canvas");
            assertThat(item.stockQuantity()).isZero();
        });
    }

    @Test
    void updateStaffPermissionsSupportsRemovingKeepingAndReAddingInSuccessiveCalls() {
        // Repro cho lỗi: clear() toàn bộ collection rồi insert lại kể cả những quyền không
        // đổi khiến Hibernate delete+insert cùng khoá (role_id, permission_id) trong một
        // flush, gây ObjectOptimisticLockingFailureException / unique constraint violation.
        userManagementService.updateStaffPermissions(new UpdateRolePermissionsRequest(Set.of(
                PermissionName.CATEGORY_MANAGE, PermissionName.PRODUCT_MANAGE, PermissionName.ORDER_MANAGE)));

        var afterFirst = userManagementService.getRoles().stream()
                .filter(role -> role.name().equals("STAFF")).findFirst().orElseThrow();
        assertThat(afterFirst.permissions()).containsExactlyInAnyOrder("CATEGORY_MANAGE", "PRODUCT_MANAGE", "ORDER_MANAGE");

        userManagementService.updateStaffPermissions(new UpdateRolePermissionsRequest(Set.of(
                PermissionName.CATEGORY_MANAGE, PermissionName.PRODUCT_MANAGE, PermissionName.PROMOTION_MANAGE)));

        var afterSecond = userManagementService.getRoles().stream()
                .filter(role -> role.name().equals("STAFF")).findFirst().orElseThrow();
        assertThat(afterSecond.permissions()).containsExactlyInAnyOrder("CATEGORY_MANAGE", "PRODUCT_MANAGE", "PROMOTION_MANAGE");
    }

    private Product savePublishedProduct(Category category, String name, String slug, BigDecimal price) {
        Product product = new Product();
        product.setCategory(category); product.setName(name); product.setSlug(slug); product.setPrice(price);
        product.setStockQuantity(5); product.setStatus(ProductStatus.PUBLISHED);
        return productRepository.saveAndFlush(product);
    }

    private ProductVariant saveVariant(
            Product product,
            String sku,
            String name,
            String material,
            BigDecimal price,
            BigDecimal widthCm,
            BigDecimal heightCm) {
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product); variant.setSku(sku); variant.setName(name); variant.setMaterial(material);
        variant.setPrice(price); variant.setWidthCm(widthCm); variant.setHeightCm(heightCm);
        variant.setStockQuantity(5); variant.setAvailable(true);
        return productVariantRepository.saveAndFlush(variant);
    }

    private void saveDeliveredOrder(User user, Product product, ProductVariant variant, String suffix) {
        Order order = new Order();
        order.setOrderCode("CATALOG-" + suffix); order.setUser(user); order.setShippingAddress("Test address");
        order.setSubtotalAmount(new BigDecimal("1400000")); order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("1400000")); order.setStatus(OrderStatus.DELIVERED);

        OrderItem item = new OrderItem();
        item.setProductId(product.getId()); item.setProductName(product.getName()); item.setProductSlug(product.getSlug());
        item.setProductVariantId(variant.getId()); item.setVariantSku(variant.getSku()); item.setVariantName(variant.getName());
        item.setVariantMaterial(variant.getMaterial()); item.setVariantWidthCm(variant.getWidthCm()); item.setVariantHeightCm(variant.getHeightCm());
        item.setProductPrice(variant.getPrice()); item.setFramePriceAdjustment(BigDecimal.ZERO);
        item.setUnitPrice(variant.getPrice()); item.setQuantity(2); item.setLineTotal(new BigDecimal("1400000"));
        order.addItem(item);
        orderRepository.saveAndFlush(order);
    }
}
