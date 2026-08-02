# Architecture

Business Store là một Spring Boot monolith tổ chức theo **package by layer**.

```text
controller -> service -> repository -> entity
                 |          |
                dto      PostgreSQL
```

- `common`: thành phần dùng chung như `BaseEntity`.
- `configuration`: cấu hình hạ tầng/JPA.
- `constant`: enum và hằng số nghiệp vụ dùng chung.
- `controller`: HTTP endpoints, chỉ nhận DTO và gọi service.
- `dto/request`, `dto/response`: contract API; không trả entity trực tiếp.
- `entity`: JPA entities.
- `exception`: mã lỗi, exception và exception handler tập trung.
- `repository`: Spring Data JPA repositories.
- `security`: Spring Security, CORS, access/refresh JWT và cookie.
- `service`, `service/impl`: interface nghiệp vụ và implementation.
- `cache`, `mapper`, `scheduling`, `util`: điểm mở rộng, chỉ thêm code khi có nhu cầu thực tế.

Flyway sở hữu schema PostgreSQL. Hibernate chạy với `ddl-auto: validate`, không tự thay đổi schema. Redis chỉ lưu trạng thái tạm thời của IAM: refresh-token whitelist, access-token blacklist và password-reset token; mỗi key đều có TTL.

IAM dùng RBAC chuẩn hóa: `User -> UserRole -> Role -> RolePermission -> Permission`. Access token chứa toàn bộ role authority (`ROLE_*`) và permission để Spring Method Security kiểm tra bằng `hasAuthority`.
