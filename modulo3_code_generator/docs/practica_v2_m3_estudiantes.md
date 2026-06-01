# Práctica V2 — Ablation Study del Análisis Estático

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** 2
> **Tiempo:** 25 minutos de trabajo en parejas + 10 minutos de puesta en común
> **Modalidad:** parejas con su propio computador, `GROQ_API_KEY` configurada y el `venv` del Módulo 3 activo

---

## Contexto

En V1 construyeron un Code Generator que produce código y tests, y lo auditaron **a ojo**: sin radon, sin complexipy, sin nada. Dijeron cosas como "esta función se ve fea" o "este test parece débil", pero no tenían con qué probarlo. Salieron de esa clase con una sensación incómoda — y esa incomodidad era el plan.

V2 llena ese vacío. M3-V2 es "Code Generator + Análisis Estático": reusa **todo** lo que construyeron en V1 (la generación de código vía RAG) e incorpora el concepto nuevo: el agente corre herramientas de análisis estático sobre el código que él mismo generó, y produce el primer **Quality Report** estructurado por característica ISO 25010.

El esqueleto `agente_v2_analisis_estatico.py` ya trae resuelto lo de fontanería: `volcar_codigo_a_disco`, `construir_quality_report`, el pipeline orquestador `pipeline_v2`, el `main`, y la reutilización de V1 (`buscar_patrones_similares`, `construir_prompt`, `generar_con_groq`, `parsear_respuesta`, importados desde `agente_v1_base.py`). Lo que falta son **5 piezas marcadas con `# TODO`** — el corazón del análisis estático. Ustedes las construyen.

---

## Las 3 acciones que van a hacer

### Acción 1 — Completar los 5 bloques `# TODO` del esqueleto

> **Tiempo:** 15 minutos

En `agente_v2_analisis_estatico.py` completen, en orden:

1. **`ejecutar_radon(code_dir)`** — corran `radon cc -j <code_dir>` y `radon mi -j <code_dir>` con `subprocess.run(..., capture_output=True, text=True)`. El flag `-j` devuelve JSON parseable. Parseen ambas salidas con `json.loads` y devuelvan un dict:
   ```
   { "cc": { "archivo.py": [ {function, complexity, rank, ...}, ... ] },
     "mi": { "archivo.py": {"mi": float, "rank": "A"} } }
   ```
   Pista: `subprocess.run(["python","-m","radon","cc","-j",str(code_dir)], ...)`.

2. **`ejecutar_complexipy(code_dir)`** — corran:
   ```
   complexipy --output-format json --quiet <code_dir>
   ```
   con `subprocess.run(..., cwd=str(code_dir))`. **Cuidado:** complexipy NO imprime el JSON a `stdout` — lo escribe a un archivo llamado `complexipy-results.json` en el directorio de trabajo actual. Por eso pasamos `cwd=code_dir`: así el archivo queda dentro de `code_dir`. Luego lean ese archivo con `json.loads(Path(code_dir / "complexipy-results.json").read_text())`. El JSON tiene esta forma:
   ```json
   [
     {"complexity": 0,  "file_name": "auth.py", "function_name": "simple",   "path": "auth.py"},
     {"complexity": 16, "file_name": "auth.py", "function_name": "compleja", "path": "auth.py"}
   ]
   ```
   Devuelvan un dict `{ "archivo.py": { "nombre_funcion": cogc_int, ... } }`. Recuerden del Tema 1: el umbral defendible de Cognitive Complexity es **< 15**.

3. **`ejecutar_bandit(code_dir)`** — corran `bandit -r -f json <code_dir>` con `subprocess.run(...)`. Parseen la salida JSON: los hallazgos vienen en `data["results"]`. Por cada hallazgo construyan un `SecurityFinding` con `test_id` (viene en `issue["test_id"]`), `severity`, `module` (viene en `issue["filename"]`), `line_number` (viene en `issue["line_number"]`) y `description` (viene en `issue["issue_text"]`).
   **Atención al mapeo de severidad:** Bandit devuelve `issue["issue_severity"]` en MAYÚSCULA (`"HIGH"`, `"MEDIUM"`, `"LOW"`), pero el enum `SecuritySeverity` espera minúscula. Conviértanlo con `.lower()` antes de construir el enum: `SecuritySeverity(issue["issue_severity"].lower())`.
   **Atención al exit code:** Bandit retorna exit code distinto de cero **cuando encuentra hallazgos** — eso es esperado, NO es un error. NO usen `check=True`.

4. **`construir_function_metrics(radon_data, complexipy_data)`** — crucen las salidas de radon y complexipy. Por cada función de `radon_data["cc"]`: tomen su `cyclomatic_complexity` y su banda (`cc_band`), busquen su `cognitive_complexity` en `complexipy_data`, calculen `exceeds_threshold = (CC >= 10) or (CogC >= 15)`, y construyan el `FunctionMetrics`. Devuelvan `list[FunctionMetrics]`.

5. **`clasificar_iso_25010(function_metrics, security_findings, maintainability_index)`** — construyan un `QualityCharacteristicResult` por cada una de las 8 características ISO 25010. Por cada una decidan el `MeasurementStatus`:
   - `MAINTAINABILITY` → **MEASURED** (con `function_metrics` + `maintainability_index`)
   - `SECURITY` → **MEASURED** (con los `security_findings` de Bandit)
   - `RELIABILITY` → MEASURED parcial o **REQUIRES_HUMAN_JUDGMENT**
   - `FUNCTIONAL_SUITABILITY` → MEASURED si los tests pasan (en V3 se afina) o **REQUIRES_HUMAN_JUDGMENT**
   - `PERFORMANCE_EFFICIENCY` → **NOT_APPLICABLE** (es runtime, V2 no lo mide)
   - `COMPATIBILITY` → **NOT_APPLICABLE** en V2
   - `PORTABILITY` → **NOT_APPLICABLE** en V2
   - `USABILITY` → **NOT_APPLICABLE** (necesita usuarios reales)

   **La clave del Tema 2:** el agente DECLARA honestamente lo que no mide. NO rellenen las 8 características en verde — eso es *checkbox compliance*, y es justo lo que esta práctica les enseña a NO hacer. Pongan en cada `verdict` una explicación breve del porqué.

---

### Acción 2 — Ejecutar V1 y V2 sobre el mismo Contract B

> **Tiempo:** 5 minutos

Primero V1, luego V2, **sobre el mismo Contract B de ejemplo**:

```bash
python agente_v1_base.py
python agente_v2_analisis_estatico.py
```

En ambos, cuando pidan la ruta, presionen Enter para usar `examples/contract_b_login_ejemplo.json` (dominio login, escenarios `SCN-001` a `SCN-004`). Cada agente guardará un Contract C en `output/`: uno `contract_c_v1_*.json` y otro `contract_c_v2_*.json`. Abran los dos.

---

### Acción 3 — Comparar V1 vs V2 y analizar el Quality Report

> **Tiempo:** 5 minutos

Primero, miren el campo `quality_report` en ambos Contract C y construyan esta tabla:

| Aspecto | Contract C de V1 | Contract C de V2 |
|---|---|---|
| Campo `quality_report` | | |
| Funciones medidas (`function_metrics`) | | |
| Funciones sobre umbral (`functions_exceeding_threshold`) | | |
| Hallazgos de seguridad (`security_findings`) | | |
| `maintainability_index` | | |
| Características ISO 25010 en `iso_25010_coverage` | | |

Después, leyendo el `quality_report` del Contract C de **V2**, respondan:

- **¿Qué funciones superan umbral?** Revisen `function_metrics`: ¿cuáles tienen `exceeds_threshold: true`, y con qué CC y CogC? ¿Coinciden con las funciones que en V1 intuyeron "feas" auditando a ojo?
- **¿Qué encontró Bandit?** Revisen `security_findings`: ¿hay hallazgos? ¿de qué `severity`? ¿los habrían detectado solo leyendo el código?
- **¿Qué características ISO 25010 quedaron MEASURED y cuáles NOT_APPLICABLE, y por qué?** Revisen las 8 filas de `iso_25010_coverage`: cada una con su `status` y su `verdict`. Para cada NOT_APPLICABLE, expliquen con sus palabras por qué V2 no puede medirla.

**Reflexionen:** el ablation hace visible el salto de "genero código" a "mido el código que genero". V1 generaba a ciegas; V2 se mide a sí mismo.

---

## Entregable final

Al cerrar los 25 minutos, cada pareja prepara un reporte breve con cuatro secciones:

| Sección | Contenido |
|---|---|
| **1. Tabla comparativa V1 vs V2** | Los 6 aspectos del Quality Report comparados entre los dos Contract C (Acción 3) |
| **2. Funciones sobre umbral y Bandit** | Qué funciones superan umbral con su CC/CogC, qué encontró Bandit, y si coincide con la auditoría a ojo de V1 |
| **3. Análisis ISO 25010** | Cuáles de las 8 características quedaron MEASURED, cuáles REQUIRES_HUMAN_JUDGMENT, cuáles NOT_APPLICABLE — y el porqué de cada NOT_APPLICABLE |
| **4. Lección personal** | ¿Qué entendieron del análisis estático y de declarar honestamente lo que no se mide, que NO sabían antes? |

---

## Comandos útiles

**Instalar las herramientas de análisis estático** (una sola vez, con el `venv` activo):
```bash
pip install radon complexipy bandit
```

**Activar el venv si no está activo:**
```bash
# PowerShell (Windows)
.\venv\Scripts\Activate.ps1

# bash (Linux/Mac)
source venv/bin/activate
```

**Ejecutar V1 (la línea base):**
```bash
python agente_v1_base.py
```

**Ejecutar V2 (Code Generator + Análisis Estático):**
```bash
python agente_v2_analisis_estatico.py
```

**Restaurar el archivo si lo rompieron al modificarlo:**
Usen el control de versiones de su editor (VS Code: `Ctrl+Z` para deshacer; o Git si lo tienen activo) para volver a la última versión que funcionaba. El archivo `agente_v2_analisis_estatico.py` es de ustedes — pueden modificarlo libremente.

---

## Recordatorio

Esta práctica las hace **construir el medidor**, no solo leer números. Eso es lo que separa a una operadora casual de IA de una ingeniera de calidad asistida por IA. La calidad de su reporte depende de tres cosas:

1. Que las **5 funciones del esqueleto corran** — radon, complexipy y Bandit como subprocess, parseo correcto, cruce correcto.
2. Que `clasificar_iso_25010` sea **honesto**: declarar MEASURED solo lo que de verdad midieron, y NOT_APPLICABLE lo que está fuera de alcance. Un reporte que pone todo en verde sin evidencia es *checkbox compliance* — y es peor que no tener reporte.
3. Que la **lección personal sea genuina** — qué entienden ahora del análisis estático y de la honestidad de un reporte de calidad, que antes no.

**Pregunten al docente cualquier duda durante los 25 minutos. La puesta en común al final es para compartir hallazgos, no para resolver dudas básicas.**

¡A construir el medidor!
