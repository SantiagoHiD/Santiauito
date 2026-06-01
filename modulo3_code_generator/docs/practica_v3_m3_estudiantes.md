# Práctica V3 — La matriz auto-generada que reemplaza el Excel

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** Construcción evolutiva del agente — V3 (Trazabilidad CMMI L3 + Coverage)
> **Tiempo:** 25 minutos de trabajo en parejas + 10 minutos de puesta en común
> **Modalidad:** parejas, cada una con su computador, `GROQ_API_KEY` configurada y el entorno de M3 activo

---

## Contexto

Acaban de ver M3-V3. El agente reusa todo lo de V1 (generación de código) y V2 (análisis estático) y agrega lo nuevo: construye la **matriz de trazabilidad bidireccional** Contract B → Contract C y mide el **branch coverage** del código generado.

Aquí va el dato que da sentido a todo: Katary obtuvo su certificación CMMI-DEV Nivel 3 presentando una matriz de trazabilidad hecha **a mano en Excel, una sola vez**, para la evaluación. Ese Excel envejeció el día después de la auditoría. V3 convierte esa matriz en un artefacto **auto-generado en cada ejecución del pipeline** — nunca miente porque se recalcula sola.

El esqueleto `agente_v3_trazabilidad.py` ya trae el pipeline orquestador, el `main` y la función `extraer_scenario_ids`. Ustedes completan los **3 bloques `# TODO`**. La regla maestra que van a aplicar (Tema 3): **trazabilidad bidireccional = todo escenario tiene al menos un test (forward) Y todo test tiene al menos un escenario (backward). Solo los huérfanos violan; many-to-many es válido.**

---

## Las 4 acciones que van a hacer

### Acción 1 — Completar `extraer_markers_de_tests` (8 min)

Implementen `extraer_markers_de_tests(tests)` en `agente_v3_trazabilidad.py`. Por cada test deben devolver la lista de scenario IDs que referencia. Hay **dos fuentes** y deben **cruzarlas**:

1. `test.scenario_ids` — lo que el LLM **declaró** cuando generó el test.
2. Los markers reales `@pytest.mark.scenario("SCN-XXX")` dentro de `test.source_code` — lo que el LLM **realmente hizo**. Extráiganlos con regex; la pista está en el docstring de la función:
   `re.findall(r'@pytest\.mark\.scenario\(["\']([^"\']+)["\']\)', codigo)`

La **fuente de verdad es el marker en el código**. Si el LLM declaró un `scenario_id` pero no lo puso como marker, ese test no es trazable de verdad. Devuelven `dict { test_name: [scenario_id, ...] }`.

### Acción 2 — Completar `construir_matriz_trazabilidad` (8 min)

Implementen `construir_matriz_trazabilidad(scenarios, test_markers)`. Reciben los escenarios (de `extraer_scenario_ids`, que ya está hecha) y el cruce de markers de la Acción 1. Construyan la matriz **bidireccional**:

- **Lado forward** — un `ScenarioTraceability` por escenario: busquen qué tests lo referencian. `status = COVERED` si tiene al menos un test; `ORPHAN_FORWARD` si tiene cero.
- **Lado backward** — un `TestTraceability` por test: miren sus scenario IDs. `status = COVERED` si justifica al menos un escenario; `ORPHAN_BACKWARD` si tiene cero.
- **Métricas:**
  - `requirements_coverage_pct` = escenarios COVERED / total escenarios × 100
  - `tests_justified_pct` = tests COVERED / total tests × 100
  - `orphan_scenarios` = lista de scenario IDs huérfanos forward
  - `orphan_tests` = lista de test names huérfanos backward
  - `cmmi_l3_compliant` = `(sin huérfanos forward) and (sin huérfanos backward)`

Devuelven un `TraceabilityMatrix`. Recuerden: **many-to-many es válido** — un test puede cubrir varios escenarios y un escenario puede tener varios tests. Solo los nodos aislados violan.

### Acción 3 — Completar `medir_coverage` (6 min)

Implementen `medir_coverage(code_dir, tests)`:

1. Escriban cada test (`test.source_code`) a un archivo `test_*.py` dentro de `code_dir`, junto al código.
2. Corran pytest con cobertura de ramas como subprocess:
   `pytest --cov --cov-branch --cov-report=json`
3. Parseen el `coverage.json` que genera pytest-cov.
4. Construyan el `CoverageReport`: `branch_coverage_pct`, `line_coverage_pct`, `meets_threshold = branch_coverage_pct >= 80`, `uncovered_modules` (archivos por debajo del umbral).

Del Tema 4: **branch coverage es la métrica principal** (siempre exige mínimo 2 tests por decisión). Line coverage va solo como referencia — no es compuerta de calidad.

### Acción 4 — Ejecutar, leer la matriz y provocar un huérfano (3 min)

1. Ejecuten V3 sobre el Contract B de ejemplo: `examples/contract_b_login_ejemplo.json` — son 4 escenarios de login, **SCN-001 a SCN-004**.
2. Abran el Contract C de salida (en `output/`) y busquen la sección `traceability_matrix`. Respondan:
   - ¿Hay huérfanos forward (`orphan_scenarios`)?
   - ¿Hay huérfanos backward (`orphan_tests`)?
   - ¿`cmmi_l3_compliant` salió `true` o `false`?
   - ¿Cuál es el `branch_coverage_pct`? ¿Pasa el umbral del 80%?
3. **Provoquen un huérfano a propósito:** busquen el test que cubre SCN-001 en el código generado y **quiten su marker** `@pytest.mark.scenario("SCN-001")`. Vuelvan a correr V3 y observen la matriz detectarlo: SCN-001 debería pasar a `ORPHAN_FORWARD` y `cmmi_l3_compliant` a `false`.

---

## Entregable final

Un reporte breve con estas secciones:

| Sección | Qué incluir |
|---|---|
| **1. Las 3 funciones completadas** | El código de `extraer_markers_de_tests`, `construir_matriz_trazabilidad` y `medir_coverage`. |
| **2. Lectura de la matriz** | Sobre el Contract B de ejemplo: huérfanos forward, huérfanos backward, `cmmi_l3_compliant`, branch coverage y si pasa el 80%. |
| **3. El huérfano provocado** | Qué marker quitaron, cómo cambió la matriz, qué escenario quedó huérfano y si `cmmi_l3_compliant` pasó a `false`. |
| **4. Lección personal** | ¿Qué entendieron de la trazabilidad CMMI L3 con esta práctica que NO sabían antes? |

---

## Comandos útiles

**Activar el entorno virtual de M3:**

PowerShell:
```powershell
.\venv\Scripts\Activate.ps1
```

bash:
```bash
source venv/bin/activate
```

**Instalar pytest-cov (si aún no está):**
```bash
pip install pytest-cov
```

**Ejecutar V3:**
```bash
python agente_v3_trazabilidad.py
```
Cuando pregunte por la ruta del Contract B, presionen Enter para usar el ejemplo de login incluido en M3 (`examples/contract_b_login_ejemplo.json`).

---

## Recordatorio

- La **fuente de verdad** de la trazabilidad es el marker en el código, no lo que el LLM declaró en `scenario_ids`. Si esas dos fuentes no coinciden, gana el código.
- `cmmi_l3_compliant` solo es `true` si **no hay huérfanos en ninguna de las dos direcciones**. Revisar una sola es revisar a medias.
- **Many-to-many es válido.** Un test que cubre tres escenarios no viola nada; un escenario con dos tests tampoco. Solo el nodo aislado — el huérfano — rompe la trazabilidad.
- **Branch coverage manda.** El umbral de M3 es 80% de branch coverage. Line coverage es solo referencia.
- Cada ejecución de V3 genera un Contract C nuevo con timestamp en `output/`. Después de quitar el marker, vuelvan a correr y lean el archivo **nuevo**, no el anterior.
