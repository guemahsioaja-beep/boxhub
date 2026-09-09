# BoxHub — starter marketplace

Prototype full-stack yang dibuat berdasarkan screenshot yang kamu kirim.

## Fitur
- Login / register
- Session user
- Saldo dompet
- Top up DEMO (langsung menambah saldo; belum payment gateway)
- Saldo poin
- Marketplace
- Filter kategori
- Pembelian produk
- Gudang / inventory
- Riwayat transaksi
- Dashboard profil
- Responsive mobile

## Jalankan di komputer
1. Install Node.js 18+.
2. Buka terminal di folder project.
3. Jalankan `npm install`
4. Jalankan `npm start`
5. Buka `http://localhost:3000`

Database SQLite otomatis dibuat sebagai `boxhub.db`.

## Penting untuk produksi
Password pada starter ini masih plaintext agar mudah dipelajari. Sebelum production, gunakan hashing seperti bcrypt/argon2, validasi input, CSRF protection, rate limiting, HTTPS, payment gateway resmi, dan object storage bila ada upload gambar.

Top up di project ini adalah DEMO dan TIDAK melakukan pembayaran sungguhan.
