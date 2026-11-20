# Cara Mendapatkan File `.apk` MputPos Secara Otomatis (Gratis via GitHub)

Proyek ini sudah dilengkapi `capacitor.config.json` dan `.github/workflows/build-apk.yml`.

## Langkah-langkah:

1. **Download / Export** seluruh kode proyek ini dari AI Studio.
2. **Upload / Push** ke repositori GitHub Anda (branch `main` atau `master`).
3. Buka repositori Anda di GitHub → pilih tab **Actions**.
4. Workflow **Build MputPos Android APK** akan berjalan otomatis (atau klik **Run workflow** untuk menjalankan manual).
5. Setelah selesai (centang hijau), buka hasil workflow tersebut lalu gulir ke bagian **Artifacts** → unduh **`MputPos-debug-apk`**.
6. Ekstrak file ZIP tersebut untuk mendapatkan **`app-debug.apk`**, lalu kirim ke HP Android dan install langsung.

## Catatan Penting Tentang Login Google di APK Android
- Google memblokir proses login OAuth standar web (`signInWithPopup` / `signInWithRedirect`) di dalam Android WebView.
- Agar tombol **Masuk dengan Akun Google** berfungsi mulus di perangkat Android tanpa error WebView:
  - **Opsi termudah (disarankan):** Deploy folder `dist/` hasil `npm run build` ke **Firebase Hosting** (`firebase deploy`), lalu buka URL Firebase Hosting tersebut di Chrome HP untuk install sebagai aplikasi (WebAPK) atau ubah menjadi APK TWA lewat `https://www.pwabuilder.com` (di TWA/Chrome, Login Google berjalan 100% normal).
  - **Opsi native Capacitor:** Pasang `@capacitor-firebase/authentication`, daftarkan aplikasi Android `com.mputpos.app` beserta SHA-1 di Firebase Console (`just-yew-x5gvv`), dan letakkan `google-services.json` di folder `android/app/`.
