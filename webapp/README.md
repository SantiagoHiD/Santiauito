# QualityAI - Aplicación Web

Interfaz web para el sistema QualityAI de refinamiento de requerimientos, generación automática de escenarios de prueba y generación de código.

## 📋 Requisitos Previos

- **Python 3.8 o superior**
- **pip** (gestor de paquetes de Python)
- **Groq API Key** ([Obtener aquí](https://console.groq.com)) — opcional, se puede usar **Mock Mode**

---

## 🚀 Instalación Rápida

### Paso 1: Verificar estructura del proyecto

Asegúrate de tener esta estructura en tu computador:

```
/tu-proyecto/
├── qualityai-modulo1/
├── qualityai-modulo2/
└── webapp/              ← Esta carpeta
```

### Paso 2: Instalar dependencias de los módulos (si no lo has hecho)

**Solo si es la primera vez que instalas:**

```bash
# Desde la raíz del proyecto
cd qualityai-modulo1
pip install -r requirements.txt
cd ..

cd qualityai-modulo2
pip install -r requirements.txt
cd ..
```

> **📝 Nota importante:** Si usas la interfaz web, **NO necesitas configurar API Key en los módulos 1 y 2**. La webapp los usa internamente y les pasa la API Key que configures en la interfaz.

### Paso 3: Instalar dependencias de la webapp

```bash
cd webapp
pip install -r requirements.txt
```

### Paso 4: Configurar API Key de Groq

**Configuración desde la interfaz:**

1. Abre la aplicación en tu navegador
2. Haz clic en el avatar de usuario (esquina superior derecha) → **Configurar API Key**
3. Ingresa tu API Key de Groq (comienza con `gsk_`), o activa **Mock Mode** para usar la aplicación sin API key
4. Haz clic en "Guardar y Continuar"

**Mock Mode:** Si activas el toggle "Usar modo simulación", la aplicación funciona completamente sin API Key, usando respuestas simuladas. Ideal para demostraciones y pruebas.

**Opción alternativa - Variable de entorno:**

```bash
# En macOS/Linux:
export GROQ_API_KEY="tu_api_key_aqui"

# En Windows (CMD):
set GROQ_API_KEY=tu_api_key_aqui

# En Windows (PowerShell):
$env:GROQ_API_KEY="tu_api_key_aqui"
```

**Opción B - Archivo .env:**

Crea un archivo `.env` en la carpeta `webapp/` con:

```
GROQ_API_KEY=tu_api_key_aqui
MOCK_GROQ_ENABLED=true    # Opcional: activa mock mode globalmente
```

### Paso 5: Ejecutar la aplicación

```bash
# Asegúrate de estar en la carpeta webapp
cd webapp
python app.py
```

### Paso 6: Abrir en el navegador

Abre tu navegador en: **http://localhost:3000**

---

## 📁 Estructura de la Webapp

```
webapp/
├── app.py                      # Servidor Flask (API + frontend)
├── requirements.txt            # Dependencias Python
├── .env                        # Configuración (API Key, Mock Mode)
├── PLAN_MEJORA_FRONTEND.md     # Roadmap de mejoras frontend
│
├── static/
│   ├── components/             # Componentes compartidos
│   │   ├── user-menu.html      # Menú desplegable de usuario
│   │   ├── user-menu.js        # Lógica del menú
│   │   ├── user-menu.css       # Estilos del menú
│   │   └── toast.js            # Sistema de notificaciones toast
│   │
│   ├── home/                   # Página principal — refinamiento de requerimientos
│   │   ├── index.html          # Interfaz principal (M0, M1, M2, M3)
│   │   └── app.js              # Lógica principal
│   │
│   ├── projects/               # Gestión de proyectos
│   │   ├── projects.html       # CRUD de proyectos
│   │   └── projects.js         # Lógica de proyectos
│   │
│   ├── scenarios/              # Generación de escenarios de prueba
│   │   ├── index.html
│   │   └── scenarios.js
│   │
│   ├── review/                 # Revisión manual de escenarios
│   │   ├── index.html
│   │   └── review.js
│   │
│   ├── history/                # Historial de generaciones
│   │   ├── history.html        # Modal de historial
│   │   └── history.js          # Lógica del historial
│   │
│   └── report/                 # Reporte ejecutivo
│       ├── index.html
│       └── report.js
```

---

## 🔧 Solución de Problemas

### Error: "ModuleNotFoundError"

Instala las dependencias:

```bash
pip install -r requirements.txt
```

### Error: "GROQ_API_KEY no configurada"

Asegúrate de haber configurado la API Key (ver Paso 4) o activar **Mock Mode** desde el menú de usuario.

### El puerto 3000 está en uso

Detén el proceso que usa el puerto o cambia el puerto en `app.py`:

```python
app.run(host='0.0.0.0', port=5000, debug=True)
```

### Los modelos tardan en cargar

La primera vez descargará modelos de embeddings (~500MB). Es normal y solo sucede una vez.

---

## 📝 Dependencias Principales

- `flask` — Framework web
- `flask-cors` — CORS para API
- `groq` — Cliente para LLM
- `sentence-transformers` — Modelos de embeddings
- `chromadb` — Base de datos vectorial
- `pydantic` — Validación de datos

---

## 🎯 Flujo de Uso

1. **Seleccionar / crear proyecto** → `projects.html`
2. **Ingresar requerimiento** (M0) → Página principal
3. **Analizar ambigüedades** (M1) → Detección automática + resolución manual
4. **Generar escenarios de prueba** (M2) → Casos de prueba Gherkin
5. **Revisar escenarios** (opcional) → Ajustes manuales + firma
6. **Generar código** (M3) → Código Python + tests + quality report
7. **Revisar código** (opcional) → Revisión manual por módulo
8. **Firmar reporte ejecutivo** → Documento final aprobado

---

## 📄 Notas Importantes

- La webapp requiere que los módulos 1 y 2 estén en la misma carpeta raíz
- Los archivos se sirven desde `/static/` con estructura organizada por carpetas
- El servidor corre en modo debug por defecto (no usar en producción)
- Los reportes se guardan en `qualityai-modulo2/output/`
- Los proyectos se almacenan en `webapp/projects.json`
- Las notificaciones toast reemplazan a los `alert()` tradicionales

---

## 💡 Funcionalidades Clave

- **Mock Mode:** Usa la aplicación sin API Key — ideal para demostraciones
- **Favoritos:** Marca proyectos como favoritos para acceso rápido
- **Toast notifications:** Sistema de notificaciones no bloqueantes con 4 tipos (éxito, error, advertencia, info)
- **Menú de usuario:** Acceso rápido a configuración, historial y documentación
- **Keyboard navigation:** Soporte para navegación por teclado con indicadores de foco visibles

## 🎯 Cómo Usar (Inicio Rápido)

1. **Crea o selecciona un proyecto**
2. **Ingresa tu requerimiento** en el área de texto
3. **Haz clic en "Iniciar Análisis Inteligente"**
4. **Resuelve las ambigüedades** que el sistema detecte
5. **Revisa los escenarios generados**
6. **Genera código** (opcional)
7. **Firma el reporte ejecutivo**

## 🔧 Tecnologías

- **Backend**: Flask + Python
- **Frontend**: HTML5 + TailwindCSS (CDN) + Font Awesome + JavaScript
- **IA**: Groq (llama-3.3-70b-versatile)
- **Embeddings**: SentenceTransformers
- **Vector DB**: ChromaDB
- **Validación**: Pydantic

## 🐛 Solución de Problemas

**Error: "GROQ_API_KEY no configurada"**
→ Activa Mock Mode desde el menú de usuario o crea archivo `.env` con tu clave

**Error: "No module named 'flask'"**
→ Ejecuta: `pip install -r requirements.txt`

**Puerto ocupado**
→ Cambia el puerto en `app.py` o detén el proceso actual

## 📝 Notas

- Resultados se guardan en `../output/webapp_v4_*.json`
- Base de conocimiento se carga automáticamente
- Sistema usa Human-in-the-Loop (máxima calidad)

---

**Versión**: 1.2.0
**Última actualización**: Junio 2026
