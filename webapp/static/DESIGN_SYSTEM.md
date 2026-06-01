# 🎨 QualityAI - Sistema de Diseño

## Paleta de Colores Principal

### Colores de Marca (Brand Colors)

**Gradiente Principal:**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Tailwind CSS:**
```html
class="bg-gradient-to-r from-indigo-600 to-purple-600"
```

**Colores Individuales:**
- **Indigo Primary:** `#667eea` / `indigo-600`
- **Purple Primary:** `#764ba2` / `purple-600`

---

## Uso de Colores por Componente

### 🎯 Headers y Navegación
```css
/* Header principal */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Tabs activos */
border-bottom: 3px solid #667eea;
color: #667eea;
```

### 👤 Menú de Usuario
```css
/* Avatar */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Header del dropdown */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Iconos de items */
background: #e0e7ff;  /* Indigo-50 */
color: #667eea;       /* Indigo-600 */
color: #764ba2;       /* Purple-600 */
color: #7c3aed;       /* Purple-500 */

/* Badges */
background: #e0e7ff;  /* Indigo-50 */
color: #4f46e5;       /* Indigo-600 */
```

### 📜 Historial (FAB)
```css
/* Botón flotante */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Badge contador */
background: #ef4444;  /* Red-500 - para notificaciones */
```

### 🔘 Botones Principales
```css
/* Botón primario */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Hover */
background: linear-gradient(135deg, #5568d3 0%, #6b3f8e 100%);
```

### 📊 Paneles Informativos
```css
/* Panel de info */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Panel de continuación */
background: linear-gradient(to-r, #e0e7ff 0%, #ede9fe 100%);
border: 2px solid #c7d2fe;
```

---

## Colores Semánticos (Estados)

### ✅ Success / Activo
```css
background: #d1fae5;  /* Green-100 */
color: #065f46;       /* Green-800 */
```

### ⚠️ Warning / Pendiente
```css
background: #fed7aa;  /* Orange-200 */
color: #9a3412;       /* Orange-800 */
```

### ❌ Error / Inactivo
```css
background: #fee2e2;  /* Red-100 */
color: #991b1b;       /* Red-800 */
```

---

## Severidades (Ambigüedades)

### Alta Severidad
```css
background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
```

### Media Severidad
```css
background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
```

### Baja Severidad
```css
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

---

## Grises Neutros

```css
/* Backgrounds */
#f9fafb  /* Gray-50 */
#f3f4f6  /* Gray-100 */
#e5e7eb  /* Gray-200 */

/* Borders */
#d1d5db  /* Gray-300 */
#9ca3af  /* Gray-400 */

/* Text */
#6b7280  /* Gray-500 */
#374151  /* Gray-700 */
#111827  /* Gray-900 */
```

---

## ⚠️ REGLAS DE CONSISTENCIA

### ✅ HACER:
1. **Siempre usar el gradiente Indigo-Purple** para elementos principales
2. **Usar variaciones de Indigo** (#e0e7ff, #c7d2fe) para fondos suaves
3. **Mantener los colores semánticos** (verde=éxito, rojo=error, naranja=warning)
4. **Usar grises neutros** para textos y bordes

### ❌ NO HACER:
1. **NO introducir nuevos colores** sin justificación
2. **NO usar amarillos, azules claros, o rosas** fuera de la paleta
3. **NO mezclar diferentes tonos de morado** (solo usar #764ba2)
4. **NO usar colores brillantes** que no estén en la paleta

---

## Ejemplos de Uso Correcto

### ✅ Correcto - Modal Header
```html
<div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
    <h2>Título del Modal</h2>
</div>
```

### ✅ Correcto - Botón Primario
```html
<button class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
    Acción Principal
</button>
```

### ✅ Correcto - Badge
```html
<span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
    Badge
</span>
```

### ❌ Incorrecto - Colores Aleatorios
```html
<!-- NO HACER -->
<div class="bg-gradient-to-r from-blue-500 to-cyan-500">
<div class="bg-yellow-400">
<div class="bg-pink-600">
```

---

## Herramientas de Referencia

**Tailwind Colors:**
- Indigo: https://tailwindcss.com/docs/customizing-colors#indigo
- Purple: https://tailwindcss.com/docs/customizing-colors#purple

**Generador de Gradientes:**
```
https://cssgradient.io/
Valores: #667eea → #764ba2 @ 135deg
```

---

## Changelog

- **2026-05-28:** Creación del sistema de diseño
- **2026-05-28:** Unificación de colores en menú de usuario y historial
