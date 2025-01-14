# E-Learning-Tracking
Ekstensi ini dibuat untuk melacak Forum diskusi pada E-Learning yang belum di dikerjakan atau dijawab oleh mahasiswa dan akan ditampilkan di halaman utama, dengan ekstensi ini mahasiswa tidak perlu membuka atau mencari di setiap pertemuan satu per satu

## Fitur
- Dapat melacak semua forum diskusi semua mata kuliah yang belum dikerjakan di halaman My Courses (waktu pelacakan 10-20 detik)
- Melacak semua forum diskusi yang belum dikerjakan di halaman salah satu mata kuliah (waktu pelacakan 5-8 detik)

## Instalasi
### Windows :
1. Download dan extract file extension [Download](https://github.com/lukman754/E-Learning-Tracking/archive/refs/heads/main.zip)
2. Buka Chrome, pergi ke **chrome://extensions/**
3. Aktifkan "**Developer mode**" di pojok kanan atas
4. Klik "**Load unpacked**" dan pilih folder extension
#### Penggunaan
1. Buka halaman E-learning > My Courses 
2. Tunggu selama 5 sampai daftar mata kuliah tampil
3. Ekstensions otomatis aktif dan akan melacak forum diskusi

### Android :
1. Download Kiwi Browser di [PlayStore](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=id&pli=1)
2. Buka Kiwi Browser, Klik menu titik 3 di kanan atas
3. Pilih Extensions
4. Aktifkan **Developer Mode** di kanan atas (jika belum)
5. Klik tombol **+ (from .zip/.crx/.user.js)**
6. Pilih file .Zip yang sudah didownload

#### Penggunaan
1. Buka halaman E-learning > My Courses 
2. Tunggu selama 5 sampai daftar mata kuliah tampil
3. Ekstensions otomatis aktif dan akan melacak forum diskusi


## Struktur File
```
E-learning/
├── manifest.json         # PWA metadata and settings.
├── course-view.js        # Untuk melacak di halaman mata kuliah
├── courses-page.js       # Untuk melacak di halaman My Courses
├── icon.png              # Application icon.
```

![screencapture-el-filkom-unpam-ac-id-my-courses-php-2025-01-14-12_04_13](https://github.com/user-attachments/assets/0069cb45-1c58-4d7d-a5e4-4eb4708a28b8)
