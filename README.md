# 📚 Omnilector — Lector Unificado de Libros EPUB y Cómics

**Omnilector** es una aplicación multiplataforma (*Android*, *iOS* y *PWA Offline-First*) que combina en una sola interfaz **Material Design 3 (Material You)** un lector avanzado de libros **EPUB** y un visor de **cómics y manga** (**CBZ, CBR, CBT, ZIP, RAR, TAR**), con un sistema de **categorías compartidas** entre ambos formatos.

---

## ✨ Características principales

### 🗂️ Biblioteca y Categorías Compartidas
- **Pestañas dedicadas**: Navegación inferior Material 3 dividida en **Libros**, **Cómics** y **Ajustes**.
- **Categorías compartidas**: Crea, edita y elimina categorías que están disponibles tanto en la vista de Libros como en la de Cómics (con contador independiente por pestaña).
- **Selección múltiple**: Permite seleccionar varios libros o cómics a la vez para moverlos de categoría o eliminarlos del dispositivo.
- **Filtros y búsqueda**: Filtrado rápido por estado (*Todos*, *En curso*, *Leídos*), por categoría y búsqueda instantánea por título o autor.
- **Importador universal inteligente**: Detecta automáticamente si un archivo es un libro EPUB o un cómic inspeccionando su contenido binario (*magic bytes* y estructura interna `META-INF/container.xml`), incluso cuando ambos usan contenedores ZIP.

### 📖 Motor de Libros (`FolioCore` — EPUB 2 y 3)
- **Aislamiento por capítulo con Shadow DOM**: Respeta la maquetación del libro sin que el CSS de la editorial rompa la interfaz de la app.
- **Paginado lateral o continuo**: Lectura paginada con columnas CSS adaptativas (1 o 2 páginas según el ancho de pantalla) o desplazamiento vertical continuo.
- **Personalización tipográfica**: 4 temas de lectura (*Claro*, *Sepia*, *Gris oscuro*, *Oscuro*), 3 familias tipográficas (*Serif*, *Sans*, *Clásica*), tamaño de letra e interlineado ajustables en vivo.
- **Navegación completa**: Tabla de contenidos jerárquica (`TOC` NCX/NAV), barra de progreso ponderada por longitud de capítulo y marcadores de página.

### 💬 Motor de Cómics y Manga (`VinetasCore` + WebAssembly)
- **Soporte nativo de formatos**: `.cbz` / `.zip`, `.cbr` / `.rar` (RAR v4 y RAR5 mediante `node-unrar-js` en **WebAssembly** integrado) y `.cbt` / `.tar`.
- **Metadatos `ComicInfo.xml`**: Reconoce título, serie y orientación de lectura.
- **Modos de lectura**: Dirección Occidental (**Izq. → Der.**) y Manga (**Der. → Izq.**), ajuste a página completa, ajuste al ancho o tamaño original.
- **Zoom y gestos fluidos**: *Pinch-to-zoom* multitáctil hasta `6x`, zoom con doble toque, paneo con inercia, cuadrícula de miniaturas con carga diferida (*lazy loading*) y marcadores de viñetas.

### ☁️ Nube y Funcionamiento 100 % Offline
- **Almacenamiento local (`IndexedDB`)**: Todos los libros, cómics, portadas y progresos de lectura se guardan en el dispositivo para leer sin conexión.
- **Integración con la nube**: Importación desde el selector de archivos del sistema (*Archivos, iCloud Drive, Google Drive, OneDrive*) o conexión directa OAuth 2.0 (PKCE) con **Google Drive** y **Microsoft OneDrive**.
- **Material You (M3)**: Tema claro, oscuro o automático según el sistema y 6 colores de acento dinámicos.

---

## 📁 Estructura del proyecto

```text
Omnilector/
├── www/                          # Código fuente Web / PWA empaquetado por Capacitor
│   ├── index.html                # Shell principal Material Design 3
│   ├── manifest.webmanifest      # Manifiesto PWA y asociación de archivos
│   ├── sw.js                     # Service Worker para funcionamiento offline
│   ├── css/
│   │   └── material3.css         # Sistema de diseño Material You (M3)
│   ├── icons/                    # Iconos de la aplicación (192, 512, maskable, Apple)
│   └── js/
│       ├── app.js                # Controlador unificado de biblioteca, categorías y lectores
│       ├── db.js                 # Capa IndexedDB (tiendas: books, comics, files, cats)
│       ├── cloud.js              # Cliente OAuth PKCE para Google Drive y OneDrive
│       └── engines/
│           ├── folio-core.js     # Motor lector EPUB 2/3 (JSZip + OPF/NCX/NAV + Sanitizer)
│           ├── vinetas-core.js   # Motor lector CBZ/CBR/CBT (JSZip + TAR + ComicInfo)
│           └── unrar-wasm.js     # Binario WebAssembly en Base64 para archivos RAR/CBR
├── android/                      # Proyecto nativo Android generado por Capacitor
├── ios/                          # Proyecto nativo iOS generado por Capacitor
├── capacitor.config.json         # Configuración de Capacitor (com.omnilector.app)
└── package.json                  # Scripts y dependencias de Capacitor
```

---

## 🛠️ Requisitos previos

1. **[Node.js](https://nodejs.org/)** (versión 18 o superior) y `npm`.
2. **Para compilar en Android**:
   - [Android Studio](https://developer.android.com/studio) (incluye Android SDK y JDK 17+).
3. **Para compilar en iOS (Apple)**:
   - Un ordenador con **macOS**.
   - [Xcode](https://developer.apple.com/xcode/) (versión 15 o superior) instalado desde la Mac App Store.
   - **CocoaPods** (`sudo gem install cocoapods` o `brew install cocoapods`).

---

## 🚀 Instalación y prueba en local (Web / PWA)

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/rogerm030/Omnilector.git
cd Omnilector
npm install
```

Para ejecutar la aplicación en el navegador como Web App / PWA:

```bash
npm start
```

Se abrirá un servidor local (por defecto en `http://localhost:3000`).

> **Nota:** Cada vez que modifiques algún archivo dentro de la carpeta `www/`, sincroniza los cambios con los proyectos nativos de Android e iOS ejecutando:
> ```bash
> npm run cap:sync
> ```

---

## 🤖 Cómo compilar para Android (`.apk` / `.aab`)

### Opción A: Usando Android Studio (Recomendado)

1. Sincroniza los activos web con el proyecto Android:
   ```bash
   npm run cap:sync
   ```
2. Abre el proyecto en **Android Studio**:
   ```bash
   npm run android
   ```
3. Espera a que Android Studio termine de indexar y sincronizar **Gradle**.
4. **Para probar en tu móvil o emulador**:
   - Conecta tu teléfono Android por USB (con *Depuración por USB* activada) o selecciona un emulador y pulsa el botón **Run (▶)**.
5. **Para generar un archivo `.apk` instalable**:
   - En el menú superior de Android Studio, ve a **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
   - Una vez finalizado, haz clic en **locate** en la notificación emergente. El APK se encontrará en:
     ```text
     android/app/build/outputs/apk/debug/app-debug.apk
     ```
6. **Para generar un `.apk` o `.aab` firmado para producción / Google Play**:
   - Ve a **Build → Generate Signed Bundle / APK…**, elige **APK** o **Android App Bundle**, crea o selecciona tu *Keystore* (`.jks`) y selecciona la variante **release**.

### Opción B: Desde la terminal (sin abrir Android Studio)

Si ya tienes configurado `ANDROID_HOME` y JDK 17 en tu terminal:

```bash
npm run cap:sync
cd android

# En Windows (PowerShell / CMD):
.\gradlew.bat assembleDebug

# En macOS / Linux:
./gradlew assembleDebug
```

El archivo `.apk` listo para instalar se generará en `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🍎 Cómo compilar para iOS / iPadOS (`.ipa`)

### Opción A: Compilación nativa con Xcode (en macOS)

1. En un Mac, instala las dependencias y sincroniza el proyecto iOS:
   ```bash
   npm install
   npm run cap:sync
   ```
2. Abre el proyecto en **Xcode**:
   ```bash
   npm run ios
   ```
   *(Esto abrirá `ios/App/App.xcworkspace` o el proyecto correspondiente en Xcode).*
3. **Configurar la firma (Signing & Capabilities)**:
   - En el panel izquierdo de Xcode, selecciona el proyecto **App**.
   - Ve a la pestaña **Signing & Capabilities**.
   - Activa **Automatically manage signing**.
   - En **Team**, selecciona tu cuenta de Apple (puedes usar un Apple ID gratuito para instalar en tu propio iPhone/iPad o una cuenta de Apple Developer para publicar en App Store).
   - Si usas un Apple ID personal, asegúrate de que el **Bundle Identifier** sea único (por ejemplo, `com.tuusuario.omnilector`).
4. **Ejecutar en iPhone / iPad o Simulador**:
   - Conecta tu iPhone o iPad por cable (o elige un simulador de iOS en la barra superior de Xcode) y pulsa **Run (⌘R)**.
   - *(En iPhone físico con cuenta gratuita: ve a `Ajustes → General → Gestión de VPN y dispositivos` en el teléfono para confiar en tu certificado de desarrollador).*
5. **Generar el archivo `.ipa` para distribución**:
   - Selecciona **Any iOS Device (arm64)** como destino en la barra superior de Xcode.
   - Ve al menú **Product → Archive**.
   - Cuando se abra la ventana *Organizer*, pulsa **Distribute App** para exportar el `.ipa` o subirlo a **App Store Connect / TestFlight**.

### Opción B: Instalación directa en iPhone / iPad como PWA (sin Mac)

Si no dispones de un Mac con Xcode, **Omnilector** está optimizada para iOS como aplicación web progresiva (*Standalone PWA*):

1. Despliega la carpeta `www/` en cualquier hosting gratuito con HTTPS (por ejemplo, **GitHub Pages**, **Vercel** o **Netlify**).
2. Abre la URL desde **Safari** en tu iPhone o iPad.
3. Pulsa el botón **Compartir** (icono del cuadrado con flecha hacia arriba) y selecciona **«Añadir a la pantalla de inicio»**.
4. La aplicación se instalará en el inicio de iOS a pantalla completa, con su propio icono y funcionando **100 % sin conexión**.

---

## 📜 Licencia

Proyecto de código abierto para lectura personal de libros EPUB y cómics sin DRM.

