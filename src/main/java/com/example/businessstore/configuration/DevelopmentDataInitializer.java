package com.example.businessstore.configuration;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.constant.RoleName;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Frame;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.ProductImage;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.User;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.FrameRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductImageRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.RoleRepository;
import com.example.businessstore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Local-only catalog data for developing the frontend. This never runs in the production profile.
 */
@Slf4j
@Component
@Profile("dev")
@Order(1)
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DevelopmentDataInitializer implements ApplicationRunner {

    private final CategoryRepository categoryRepository;
    private final FrameRepository frameRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductFrameOptionRepository productFrameOptionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email}")
    private String adminEmail;

    @Value("${app.seed.admin-password}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Role adminRole = roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())
                .orElseThrow(() -> new IllegalStateException("ADMIN role was not initialized"));

        seedAdmin(adminRole);

        Category oilPainting = seedCategory(
                "tranh-son-dau", "Tranh sơn dầu", "Tác phẩm sơn dầu nguyên bản cho không gian sống.");
        Category canvas = seedCategory(
                "tranh-canvas", "Tranh canvas", "Bản in canvas hiện đại, bền màu và dễ bài trí.");
        Category abstractArt = seedCategory(
                "tranh-truu-tuong", "Tranh trừu tượng", "Những mảng màu giàu cảm xúc cho không gian đương đại.");

        Frame oak = seedFrame("khung-go-soi", "Khung gỗ sồi", "Gỗ sồi", "Tự nhiên", "28", "420000");
        Frame black = seedFrame("khung-den-toi-gian", "Khung đen tối giản", "Composite", "Đen mờ", "22", "350000");
        Frame gold = seedFrame("khung-vang-co-dien", "Khung vàng cổ điển", "Composite", "Vàng champagne", "32", "550000");

        seedProduct(
                "binh-minh-tren-pho", "Bình minh trên phố", oilPainting,
                "Phố nhỏ đón ánh nắng đầu ngày với bảng màu ấm và những nét cọ giàu chất thơ.",
                "3900000", "60", "80", "8", "binh-minh-tren-pho",
                List.of(new VariantSeed("TBS-BM-4060", "40 × 60 cm", "40", "60", "Canvas", "2800000", 5),
                        new VariantSeed("TBS-BM-6080", "60 × 80 cm", "60", "80", "Canvas", "3900000", 8)),
                List.of(oak, black, gold));
        seedProduct(
                "sen-trong-som-mai", "Sen trong sớm mai", oilPainting,
                "Hoa sen và mặt nước yên ả, phù hợp với phòng khách hoặc góc thư giãn.",
                "3200000", "50", "70", "10", "sen-trong-som-mai",
                List.of(new VariantSeed("TBS-SM-3550", "35 × 50 cm", "35", "50", "Canvas", "2200000", 6),
                        new VariantSeed("TBS-SM-5070", "50 × 70 cm", "50", "70", "Canvas", "3200000", 10)),
                List.of(oak, gold));
        seedProduct(
                "nhip-dieu-hinh-khoi", "Nhịp điệu hình khối", abstractArt,
                "Bố cục hình khối mạnh mẽ, tạo điểm nhấn cho không gian làm việc hiện đại.",
                "2500000", "60", "60", "12", "nhip-dieu-hinh-khoi",
                List.of(new VariantSeed("TBS-ND-4040", "40 × 40 cm", "40", "40", "Canvas", "1800000", 8),
                        new VariantSeed("TBS-ND-6060", "60 × 60 cm", "60", "60", "Canvas", "2500000", 12)),
                List.of(black, oak));
        seedProduct(
                "mien-nho-da-lat", "Miền nhớ Đà Lạt", canvas,
                "Khung cảnh đồi thông và sương sớm được tái hiện bằng chất liệu canvas sắc nét.",
                "1800000", "50", "75", "15", "mien-nho-da-lat",
                List.of(new VariantSeed("TBS-DL-3550", "35 × 50 cm", "35", "50", "Canvas", "1300000", 10),
                        new VariantSeed("TBS-DL-5075", "50 × 75 cm", "50", "75", "Canvas", "1800000", 15)),
                List.of(oak, black));

        log.info("Development seed is ready. Admin account: {}", adminEmail);
    }

    private void seedAdmin(Role adminRole) {
        User admin = userRepository.findByEmail(adminEmail.trim().toLowerCase()).orElse(null);
        if (admin == null) {
            admin = new User();
            admin.setEmail(adminEmail.trim().toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setFirstName("Quản trị viên");
            admin.setLastName("Tranh Business");
            admin.setPhone("0900000000");
        }
        admin.addRole(adminRole);
        userRepository.save(admin);
    }

    private Category seedCategory(String slug, String name, String description) {
        return categoryRepository.findBySlug(slug).orElseGet(() -> {
            Category category = new Category();
            category.setSlug(slug);
            category.setName(name);
            category.setDescription(description);
            return categoryRepository.save(category);
        });
    }

    private Frame seedFrame(String slug, String name, String material, String color, String widthMm, String adjustment) {
        return frameRepository.findBySlugAndStatus(slug, FrameStatus.ACTIVE).orElseGet(() -> {
            Frame frame = new Frame();
            frame.setSlug(slug);
            frame.setName(name);
            frame.setMaterial(material);
            frame.setColor(color);
            frame.setWidthMm(money(widthMm));
            frame.setPriceAdjustment(money(adjustment));
            frame.setDescription("Khung mẫu dùng cho môi trường development.");
            frame.setImageUrl("https://placehold.co/640x640/30241f/f5f0e8?text=" + slug);
            frame.setStatus(FrameStatus.ACTIVE);
            return frameRepository.save(frame);
        });
    }

    private void seedProduct(
            String slug,
            String name,
            Category category,
            String description,
            String price,
            String width,
            String height,
            String stock,
            String imageKey,
            List<VariantSeed> variants,
            List<Frame> frames) {
        if (productRepository.existsBySlug(slug)) {
            return;
        }

        Product product = new Product();
        product.setSlug(slug);
        product.setName(name);
        product.setCategory(category);
        product.setDescription(description);
        product.setPrice(money(price));
        product.setWidthCm(money(width));
        product.setHeightCm(money(height));
        product.setStockQuantity(Integer.parseInt(stock));
        product.setStatus(ProductStatus.PUBLISHED);
        product = productRepository.save(product);

        for (VariantSeed variantSeed : variants) {
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku(variantSeed.sku());
            variant.setName(variantSeed.name());
            variant.setWidthCm(money(variantSeed.widthCm()));
            variant.setHeightCm(money(variantSeed.heightCm()));
            variant.setMaterial(variantSeed.material());
            variant.setPrice(money(variantSeed.price()));
            variant.setStockQuantity(variantSeed.stockQuantity());
            variant.setAvailable(true);
            productVariantRepository.save(variant);
        }

        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setPublicId("development-seed/products/" + imageKey);
        image.setSecureUrl("https://placehold.co/1200x900/f5f0e8/30241f?text=" + imageKey);
        image.setAltText(name);
        image.setSortOrder(1);
        image.setPrimaryImage(true);
        productImageRepository.save(image);

        for (Frame frame : frames) {
            ProductFrameOption option = new ProductFrameOption();
            option.setProduct(product);
            option.setFrame(frame);
            option.setPriceAdjustment(frame.getPriceAdjustment());
            option.setMinWidthCm(money("20"));
            option.setMaxWidthCm(money("120"));
            option.setMinHeightCm(money("20"));
            option.setMaxHeightCm(money("120"));
            option.setAvailable(true);
            productFrameOptionRepository.save(option);
        }
    }

    private BigDecimal money(String value) {
        return new BigDecimal(value);
    }

    private record VariantSeed(
            String sku,
            String name,
            String widthCm,
            String heightCm,
            String material,
            String price,
            int stockQuantity) {
    }
}
