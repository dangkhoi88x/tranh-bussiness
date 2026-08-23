# C4 Context — Business Store

![C4 Context](assets/c4-context.svg)

Nguồn Mermaid: [diagrams/c4-context.mmd](diagrams/c4-context.mmd).

Hệ thống được mô hình hóa như một sản phẩm duy nhất vì repository chỉ chứa một backend Spring Boot `business-store` và một frontend React. Google OAuth, Cloudinary và SMTP là hệ thống ngoài có bằng chứng trong source/config. PostgreSQL và Redis là chi tiết container nên không xuất hiện ở cấp Context.

Evidence: `frontend/src/main.tsx`; `BusinessStoreApplication.java`; `GoogleOAuthServiceImpl.java`; `CloudinaryMediaStorageService.java`; `MailServiceImpl.java`.
