# Portal Kelas VII C — GitHub Pages + Supabase

Starter website kelas dengan login, dashboard siswa/admin, presensi, pengumuman, piket, notifikasi dalam website, dan uang kas.

## 1. Buat project Supabase
1. Buka https://supabase.com/ lalu buat project baru.
2. Simpan database password di tempat aman.
3. Buka **Project Settings → API**. Salin **Project URL** dan **anon/public key**.
4. Di **Authentication → Sign In / Providers**, pastikan Email aktif.
5. Di **Authentication → Settings**, matikan public sign-ups (Disable sign ups). Akun hanya dibuat admin.

## 2. Buat database
1. Buka **SQL Editor → New query**.
2. Buka file `supabase/schema.sql` dari folder proyek ini.
3. Salin semua isinya ke SQL Editor, lalu klik **Run**.

## 3. Siapkan file konfigurasi
1. Duplikat `config.example.js` dan beri nama `config.js`.
2. Isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dari langkah 1.
3. Upload `config.js` ke GitHub bersama file lainnya. URL project dan anon/public key memang digunakan di browser; keduanya bukan service-role secret. **Jangan pernah gunakan service_role key.** Karena GitHub Pages bersifat publik, jangan taruh password, service-role key, atau data rahasia di file JavaScript.
4. Catatan: GitHub Pages hanya bisa menyajikan file statis. Supabase Auth dan RLS yang mengamankan data.

## 4. Buat 30 akun
Di Supabase → **Authentication → Users → Add user → Create new user**:
- Buat 28 akun siswa.
- Buat 2 akun admin (akun kamu dan guru).
- Gunakan email yang bisa diakses masing-masing pemilik akun dan password sementara yang aman. Minta pemilik akun menggantinya setelah login bila alur reset password sudah ditambahkan.

Setelah setiap user dibuat, salin UUID user dari daftar Users. Lalu di SQL Editor jalankan perintah berikut, ganti UUID dan nama:
```sql
insert into public.profiles (id, full_name, role)
values
('UUID-SISWA-1', 'Nama Siswa 1', 'siswa'),
('UUID-SISWA-2', 'Nama Siswa 2', 'siswa'),
('UUID-ADMIN-KAMU', 'Admin Kelas', 'admin'),
('UUID-ADMIN-GURU', 'Guru', 'admin');
```
Tambahkan semua 30 akun dalam satu perintah `values`. Pastikan hanya dua akun admin yang memakai role `admin`.

## 5. Upload ke GitHub
1. Buat repository baru, misalnya `portal-kelas-vii-c`.
2. Upload `index.html`, `style.css`, `app.js`, `config.js`, dan folder `supabase`.
3. Jangan upload `config.example.js` sebagai pengganti config aktif; `config.js` harus berisi URL dan anon key project kamu.
4. Buka **Settings → Pages**.
5. Pada **Build and deployment**, pilih **Deploy from a branch**.
6. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
7. Tunggu proses selesai dan buka alamat Pages yang diberikan GitHub.

## 6. Cara menggunakan
- Siswa login dengan email/password yang dibuat admin.
- Admin masuk ke **Panel Admin** untuk membuat pengumuman, presensi, jadwal piket, dan catatan uang kas.
- Siswa hanya melihat data miliknya sendiri, pengumuman kelas, dan notifikasi miliknya.
- Notifikasi piket dibuat saat admin menyimpan jadwal. Ini notifikasi di dalam website, bukan WhatsApp. Agar muncul tepat pada hari piket walaupun siswa tidak membuka website, tahap berikutnya perlu scheduled function/cron di Supabase. Saat ini notifikasi langsung dibuat ketika jadwal disimpan.

## Penting sebelum dipakai sungguhan
- Jalankan SQL schema dan uji dengan dua akun percobaan (1 admin, 1 siswa) dahulu.
- Jangan bagikan password admin.
- Jangan pernah menaruh `service_role` key di JavaScript atau GitHub.
- File `config.js` memuat anon/public key, bukan rahasia; keamanan data wajib berasal dari Row Level Security (RLS).
- Starter ini belum punya fitur edit/hapus data, ekspor laporan, reset password, maupun pengingat otomatis terjadwal ketika siswa offline. Itu bisa ditambahkan setelah login dan database dasar berhasil.
