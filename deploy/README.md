# VPS deploy runbook

Ghi chú vận hành cho VPS chạy nghiadang.site và các site khác. Không chứa mật khẩu hay private key.

## 1. Thông tin VPS

| Mục | Giá trị |
|---|---|
| IP | `103.200.20.41` |
| Hostname | `nghiavps-ztky` |
| OS | Ubuntu 24.04 LTS, 2 GB RAM, ổ 38 GB |
| Web server | Nginx 1.24 (`/etc/nginx/sites-available` + symlink `sites-enabled`) |
| SSL | Certbot (Let's Encrypt), tự gia hạn qua `certbot.timer` |
| Firewall | UFW: chỉ mở OpenSSH, 80, 443 |
| Chống brute-force | fail2ban jail `sshd`: **5 lần lỗi trong 10 phút → chặn IP 10 phút** |
| DNS tên miền | Quản lý tại `zonedns.vn` (bản ghi A trỏ về IP trên) |

## 2. Đăng nhập SSH

- **Root bị cấm SSH** (`PermitRootLogin no`). Đăng nhập bằng user `nghia` (chỉ key, không mật khẩu), có sudo không cần mật khẩu (`/etc/sudoers.d/90-nghia`).
- Key dùng: `~/.ssh/id_ed25519` trên MacBook.
- **Luôn chỉ định đúng một key.** Máy có nhiều key; SSH mặc định thử lần lượt từng key, mỗi key sai bị fail2ban tính là 1 lần lỗi → dễ bị chặn.

```bash
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes nghia@103.200.20.41
```

Nên thêm vào `~/.ssh/config` để gõ gọn `ssh nghiavps`:

```
Host nghiavps
  HostName 103.200.20.41
  User nghia
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
```

- Nếu bị chặn (`Connection refused` ở cổng 22 trong khi web vẫn chạy): đợi 10 phút, hoặc vào console web của nhà cung cấp rồi chạy `fail2ban-client set sshd unbanip <IP>`.

## 3. Các site đang chạy trên VPS

| Tên miền | Kiểu | Nginx config | Gốc / cổng |
|---|---|---|---|
| nghiadang.site, www | Static | `nghiadang.site.conf` | `/var/www/nghiadang.site` |
| leadstracking.nghiadang.site | App + static | `funnel` (**default_server cổng 80**) | `/var/www/leadstracking/app/dist`, proxy `127.0.0.1:3000` |
| n8n.nghiadang.site | Docker | `n8n.nghiadang.site.conf` | proxy `127.0.0.1:5678` |
| saohop.com, www | App | `saohop.conf` | proxy `127.0.0.1:3101` |
| dev.saohop.com | App | `saohop.conf` | proxy `127.0.0.1:3102` |

Cổng đã dùng: 3000, 3101, 3102, 5678 (n8n), 5432 (Postgres trong Docker). App mới chọn cổng khác.

## 4. Cập nhật nghiadang.site

```bash
./deploy/deploy.sh
```

Script chỉ gom file trang dùng, rsync vào `/var/www/nghiadang.site` (`--delete` chỉ trong thư mục đó). Không đụng Nginx, không cần reload. Nhớ tăng `?v=N` trong `index.html` khi sửa CSS/JS.

## 5. Thêm landing page mới

Ví dụ landing `abc.nghiadang.site` (hoặc tên miền riêng `abc.com`).

1. **DNS:** tạo bản ghi A `abc` → `103.200.20.41` (hoặc A `@` và `www` nếu là tên miền riêng). Kiểm tra: `dig +short abc.nghiadang.site`.
2. **Thư mục:**
   ```bash
   ssh nghiavps 'sudo mkdir /var/www/abc && sudo chown nghia:nghia /var/www/abc'
   ```
3. **Upload file** (từ thư mục build của landing):
   ```bash
   rsync -az --delete -e "ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes" ./dist/ nghia@103.200.20.41:/var/www/abc/
   ```
   macOS dùng openrsync: không có `--chmod`, hãy `chmod 755` thư mục / `644` file ở máy trước khi rsync.
4. **Nginx config** — copy `deploy/nginx/nghiadang.site.conf`, đổi `server_name` và `root`, lưu thành `abc.conf`:
   ```bash
   scp -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes abc.conf nghia@103.200.20.41:/tmp/
   ssh nghiavps 'sudo tar czf /root/nginx-backup-$(date +%Y%m%d-%H%M%S).tgz -C / etc/nginx \
     && sudo install -m 644 /tmp/abc.conf /etc/nginx/sites-available/abc.conf \
     && sudo ln -s /etc/nginx/sites-available/abc.conf /etc/nginx/sites-enabled/abc.conf \
     && sudo nginx -t && sudo systemctl reload nginx'
   ```
   Nếu `nginx -t` báo lỗi: `sudo rm /etc/nginx/sites-enabled/abc.conf` rồi `sudo nginx -t` lại — **không reload khi test lỗi**.
5. **SSL** (sau khi DNS đã trỏ đúng):
   ```bash
   ssh nghiavps 'sudo certbot --nginx -d abc.nghiadang.site --non-interactive --redirect'
   ```
6. **Kiểm tra** site mới trả về 200 và các site cũ vẫn như trước:
   ```bash
   for u in https://abc.nghiadang.site https://nghiadang.site https://saohop.com https://n8n.nghiadang.site https://leadstracking.nghiadang.site; do printf "%-40s " $u; curl -s -o /dev/null -w "%{http_code}\n" $u; done
   ```

### Lưu ý khi viết Nginx config

- **Không thêm `listen [::]:80;` / `[::]:443`.** Site n8n đã giữ `listen [::]:443 ssl ipv6only=on`; nếu config mới có dòng IPv6, certbot sẽ thêm `ipv6only=on` lần nữa và `nginx -t` báo lỗi trùng.
- **Không dùng `default_server`** — `funnel` (leadstracking) đang là default của cổng 80.
- Mỗi site một file riêng, `server_name` riêng, log riêng (`/var/log/nginx/<site>.access.log`).
- App Node/Next.js: dùng `proxy_pass http://127.0.0.1:<cổng>` như `saohop.conf`, chạy app bằng pm2/systemd/Docker và chỉ bind `127.0.0.1`.

## 6. Sao lưu & dọn dẹp

- Bản sao lưu cấu hình Nginx trước khi thêm nghiadang.site: `/root/nginx-backup-20261106-124632.tgz`.
- Việc tuỳ chọn:
  - `/root/.ssh/authorized_keys` có 7 dòng key trùng (vô hại) — có thể xoá bớt.
  - Muốn chặt hơn: xoá `/etc/sudoers.d/90-nghia` sau khi setup xong (user `nghia` vẫn deploy được vào thư mục mình sở hữu, nhưng mất sudo — sẽ không tạo được site mới).
