# Práctica de M3-V3 — La matriz auto-generada que reemplaza el Excel

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** Construcción evolutiva del agente — V3 (Trazabilidad CMMI L3 + Coverage)
> **Versión que aplica:** M3-V3 (Code Generator + Trazabilidad CMMI L3 + Coverage)
> **Tiempo estimado:** 1h15 (15 min explicación docente + 15 min lectura de código + 25 min práctica en parejas + 10 min puesta en común)
> **Modalidad:** parejas con su propio computador, `GROQ_API_KEY` configurada y entorno de M3 activo
> **Pre-requisito:** las parejas ya tienen V1 (generación) y V2 (análisis estático) funcionando en su entorno, y vieron en presencial los Temas 3 (trazabilidad CMMI L3 medible) y 4 (coverage criteria)

---

## 1. Para el docente — contexto y propósito

Esta es la práctica donde la trazabilidad deja de ser una palabra de auditoría y se vuelve código que corre. **El propósito pedagógico es que las parejas construyan, con sus propias manos, la matriz de trazabilidad bidireccional y vean al agente detectar huérfanos en vivo.**

El gancho narrativo es real y conviene contarlo: Katary obtuvo su certificación CMMI-DEV Nivel 3 presentando una matriz de trazabilidad hecha **a mano en Excel, una sola vez**, para la evaluación. V3 convierte ese artefacto muerto en una matriz **auto-generada en cada ejecución del pipeline**. Esa es la diferencia entre "compliance de fotografía" y "compliance vivo". Las parejas deben terminar la clase entendiendo esa diferencia en la piel.

**Triple objetivo pedagógico:**

1. **Construcción activa:** las parejas completan los 3 `# TODO` del esqueleto `agente_v3_trazabilidad.py`. No leen una matriz ya hecha — la programan. Para escribir `construir_matriz_trazabilidad` tienen que internalizar la regla maestra del Tema 3: solo los huérfanos violan, many-to-many es válido.
2. **La fuente de verdad es el código, no la declaración:** en `extraer_markers_de_tests` cruzan dos fuentes — lo que el LLM *dijo* (`test.scenario_ids`) y lo que el LLM *hizo* (los markers `@pytest.mark.scenario(...)` en el código). Aprenden que la trazabilidad se verifica contra el artefacto, no contra la promesa.
3. **Provocar el huérfano:** la parte más formativa es la Acción 4. Las parejas quitan deliberadamente un marker de un test y vuelven a correr. Ver la matriz pasar de `cmmi_l3_compliant: true` a `false` — y señalar exactamente cuál escenario quedó huérfano — es el momento en que entienden que la matriz no es decorativa.

**Por qué este enfoque supera a "explicar la matriz en diapositivas":** una diapositiva muestra una matriz perfecta. El código muestra una matriz que se rompe cuando el LLM se equivoca. La trazabilidad real no es el caso feliz: es el mecanismo que atrapa el caso infeliz. Eso solo se aprende rompiéndolo.

---

## 2. Enunciado para entregar a los estudiantes

> ### Práctica V3 — La matriz auto-generada que reemplaza el Excel
>
> **Contexto:** acaban de ver M3-V3. Reusa todo lo de V1 (generación) y V2 (análisis estático) y agrega lo nuevo: el agente construye la matriz de trazabilidad bidireccional Contract B → Contract C y mide el branch coverage del código generado. El esqueleto `agente_v3_trazabilidad.py` ya trae el pipeline orquestador, el `main` y `extraer_scenario_ids`. Ustedes completan los 3 bloques `# TODO`.
>
> **Su tarea, en cuatro acciones secuenciales:**
>
> ### Acción 1 — Completar `extraer_markers_de_tests` (8 min)
>
> Implementen `extraer_markers_de_tests(tests)` en `agente_v3_trazabilidad.py`. Por cada test deben devolver la lista de scenario IDs que referencia. Hay **dos fuentes** y deben cruzarlas:
> - `test.scenario_ids` — lo que el LLM *declaró* al generar.
> - Los markers reales `@pytest.mark.scenario("SCN-XXX")` dentro de `test.source_code` — lo que el LLM *hizo*. Extráiganlos con la regex de la pista del docstring.
>
> La fuente de verdad es el **marker en el código**. Si el LLM declaró un `scenario_id` pero no lo puso como marker, ese test no es trazable de verdad. Devuelven `dict { test_name: [scenario_id, ...] }`.
>
> ### Acción 2 — Completar `construir_matriz_trazabilidad` (8 min)
>
> Implementen `construir_matriz_trazabilidad(scenarios, test_markers)`. Construyan la matriz **bidireccional**:
> - **Lado forward:** un `ScenarioTraceability` por escenario. `status = COVERED` si tiene al menos un test; `ORPHAN_FORWARD` si tiene cero.
> - **Lado backward:** un `TestTraceability` por test. `status = COVERED` si justifica al menos un escenario; `ORPHAN_BACKWARD` si tiene cero.
> - **Métricas:** `requirements_coverage_pct`, `tests_justified_pct`, `orphan_scenarios`, `orphan_tests`, y `cmmi_l3_compliant = (sin huérfanos forward) and (sin huérfanos backward)`.
>
> Recuerden la regla maestra del Tema 3: **solo los huérfanos violan; many-to-many es válido.**
>
> ### Acción 3 — Completar `medir_coverage` (6 min)
>
> Implementen `medir_coverage(code_dir, tests)`. Vuelquen cada test a un archivo `test_*.py` junto al código, corran `pytest --cov --cov-branch --cov-report=json` con `subprocess.run(...)`, parseen `coverage.json` y construyan el `CoverageReport`: `branch_coverage_pct`, `line_coverage_pct`, `meets_threshold = branch_coverage_pct >= 80`, `uncovered_modules`. Del Tema 4: **branch coverage es la métrica principal; line coverage es solo referencia.**
>
> ### Acción 4 — Ejecutar, leer la matriz y provocar un huérfano (3 min)
>
> 1. Ejecuten V3 sobre el Contract B de ejemplo (`examples/contract_b_login_ejemplo.json`, 4 escenarios de login SCN-001 a SCN-004).
> 2. Lean la matriz generada en el Contract C de salida: ¿hay huérfanos forward? ¿backward? ¿el proyecto es `cmmi_l3_compliant`? ¿cuál es el branch coverage?
> 3. **Provoquen un huérfano deliberadamente:** en el código generado del test que cubre SCN-001, quiten el marker `@pytest.mark.scenario("SCN-001")`. Vuelvan a correr V3 y observen la matriz detectarlo.
>
> ### Entregable final (al cerrar los 25 min)
>
> Un reporte breve con:
> 1. **Las 3 funciones completadas** (el código de los 3 `# TODO`).
> 2. **Lectura de la matriz** del Contract B de ejemplo: huérfanos forward, huérfanos backward, `cmmi_l3_compliant`, branch coverage.
> 3. **El huérfano provocado:** qué marker quitaron, cómo cambió la matriz, qué escenario quedó huérfano y si `cmmi_l3_compliant` pasó a `false`.
> 4. **Una lección personal:** ¿qué entendieron de la trazabilidad CMMI L3 con esta práctica que NO sabían antes?

---

## 3. Solución modelo (para el docente)

### Qué deberían lograr las parejas

**Acción 1 — `extraer_markers_de_tests`.** La implementación correcta itera sobre `tests`, aplica `re.findall(r'@pytest\.mark\.scenario\(["\']([^"\']+)["\']\)', test.source_code)` para sacar los markers reales, y los cruza con `test.scenario_ids`. La decisión de diseño correcta: **priorizar el marker del código**. Una pareja que use solo `test.scenario_ids` no entendió el punto — la práctica entera depende de que la fuente de verdad sea el artefacto.

**Acción 2 — `construir_matriz_trazabilidad`.** Forward: por cada `scenario_id`, recolectar los tests cuyo `test_markers` lo contiene. Backward: por cada test, sus scenario IDs. `cmmi_l3_compliant` es `True` solo si **ambas** listas de huérfanos están vacías. Banderas rojas: confundir forward con backward; calcular `cmmi_l3_compliant` mirando solo una dirección; tratar many-to-many como violación.

**Acción 3 — `medir_coverage`.** Volcar tests, `subprocess.run` con `--cov-branch --cov-report=json`, parsear `coverage.json`. `meets_threshold` se compara contra **branch coverage**, no line. Bandera roja: usar `line_coverage_pct` como compuerta.

### Qué huérfanos esperar

Con el Contract B de ejemplo y `temperature=0`, lo más probable es que el LLM genere tests con markers para los 4 escenarios y la matriz salga `cmmi_l3_compliant: true`. **Pero no es garantizado** — el LLM a veces:
- No pone marker para SCN-004 (bloqueo de cuenta, el escenario boundary más complejo) → **huérfano forward**.
- Genera un test técnico extra (un `test_setup` o un helper) sin marker → **huérfano backward**.

Si la matriz sale limpia en la Acción 4, el huérfano provocado a mano es el que garantiza que vean el mecanismo funcionar. Si ya salió un huérfano natural, mejor aún: comenten ese caso real en la puesta en común.

---

## 4. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Puntos | Detalle |
|---|---|---|
| **Acción 1 — `extraer_markers_de_tests`** | 25 | Cruza ambas fuentes y prioriza el marker del código. Usa solo `test.scenario_ids` ignorando el código: −15. Regex mal construida o no extrae markers: −10. |
| **Acción 2 — `construir_matriz_trazabilidad`** | 30 | Construye forward y backward, métricas correctas, `cmmi_l3_compliant` mira ambas direcciones. Solo una dirección: −15. `cmmi_l3_compliant` mal calculado: −10. Trata many-to-many como violación: −10. |
| **Acción 3 — `medir_coverage`** | 20 | Vuelca tests, corre pytest-cov con `--cov-branch`, parsea JSON, `meets_threshold` contra branch. Usa line como compuerta: −10. No corre como subprocess: −10. |
| **Acción 4 — Lectura de matriz + huérfano provocado** | 15 | Ejecutaron V3, leyeron la matriz y provocaron el huérfano observando el cambio. Sin provocar el huérfano: −10. Sin leer la matriz: −5. |
| **Lección personal articulada** | 10 | Lección genuina sobre trazabilidad CMMI L3. Genérica ("aprendí trazabilidad"): −7. Sin lección: −10. |

**Escalas:**
- **≥ 90 puntos:** excelente — construyeron la matriz completa, entienden la regla maestra y vieron el mecanismo detectar el huérfano.
- **70 a 89 puntos:** aprobado — completaron los 3 TODO con calidad razonable.
- **50 a 69 puntos:** reprobado — completaron menos del 50% o con errores conceptuales serios.
- **< 50 puntos:** no comprendieron la trazabilidad bidireccional, requieren acompañamiento individual.

---

## 5. Puesta en común (10 minutos finales)

**Dinámica recomendada:**

1. El docente proyecta el Contract C de salida de 2-3 parejas y abre la sección `traceability_matrix`.
2. Para cada matriz, la clase responde:
   - *"¿Salió `cmmi_l3_compliant: true` o `false`? ¿Por qué?"*
   - *"Cuando quitaron el marker, ¿el escenario quedó como `ORPHAN_FORWARD` o `ORPHAN_BACKWARD`? ¿Por qué esa dirección y no la otra?"*
   - *"¿El branch coverage pasó el umbral del 80%? Si no, ¿qué módulo quedó en `uncovered_modules`?"*
3. El docente cierra con dos mensajes pedagógicos.

**Mensajes pedagógicos clave para el cierre** (decir literalmente):

> *Mensaje 1:* "Katary sacó su CMMI L3 con una matriz de trazabilidad en Excel hecha a mano, una vez, para la evaluación. Lo que ustedes acaban de programar regenera esa matriz en cada ejecución del pipeline. Esa es la diferencia entre compliance de fotografía y compliance vivo: el Excel envejece el día después de la auditoría, la matriz auto-generada nunca miente porque se recalcula sola."

> *Mensaje 2:* "El momento clave fue cuando quitaron el marker y la matriz lo detectó. Fíjense que la fuente de verdad no fue lo que el LLM declaró en `scenario_ids` — fue el marker en el código. La trazabilidad real se verifica contra el artefacto, no contra la promesa. Eso lo van a necesitar en V4, cuando el desarrollador senior revise el Contract C: la matriz le dice dónde mirar primero."

---

## 6. Errores típicos que vas a ver en clase (anticípate)

1. **Usar solo `test.scenario_ids` y olvidar la regex** (~35%). Es el atajo tentador. El test pasa con el Contract B de ejemplo pero falla el propósito: si el LLM declara un ID que no puso como marker, lo cuentan como trazable cuando no lo es. Recordar en clase: "la verdad está en el código, no en la declaración".

2. **Confundir forward con backward** (~25%). Calculan `ScenarioTraceability` con la lógica de tests y viceversa. Síntoma: huérfanos en la dirección equivocada. Aclarar con la cadena: escenario → test es forward; test → escenario es backward.

3. **`cmmi_l3_compliant` mirando una sola dirección** (~20%). Ponen `cmmi_l3_compliant = not orphan_scenarios` y olvidan `orphan_tests`. Recordar: CMMI L3 exige cero huérfanos en **ambas** direcciones.

4. **Usar line coverage como compuerta** (~15%). Ponen `meets_threshold = line_coverage_pct >= 80`. Del Tema 4: branch coverage es el estándar, line es solo referencia.

5. **No volver a correr V3 después de quitar el marker** (~10%). Quitan el marker pero leen la matriz vieja en caché o el Contract C anterior. Recordar: cada ejecución genera un Contract C con timestamp nuevo en `output/`.

---

## 7. Conexión con el resto del curso

- **Viene de V2:** V2 les dio el Quality Report — métricas objetivas de CC, CogC, MI y seguridad sobre el código generado. V3 agrega la otra mitad de la evidencia auditable: la matriz de trazabilidad y el coverage. Juntos, V2 + V3 son el cuerpo de evidencia que CMMI L3 espera de un proceso definido.

- **Habilita V4:** en V4 entra el desarrollador senior con el HITL (`review_cli_dev.py`). La matriz de trazabilidad que las parejas construyeron aquí es lo primero que el revisor mira: le dice qué escenarios están sin cubrir y qué tests no se justifican. La matriz no reemplaza el juicio humano — lo dirige.

- **Conexión con CMMI L3:** la trazabilidad bidireccional es un requisito directo del área de proceso de gestión de requisitos en CMMI-DEV. Que sea **medible y auto-generada** es lo que la diferencia del checkbox compliance. Las parejas están practicando una capacidad real de ingeniero de calidad en una empresa Nivel 3.

- **El músculo de "romper para entender":** provocar el huérfano deliberadamente es el mismo músculo que se entrena en la auditoría crítica del Módulo 4 — modificar el sistema y observar el efecto. Aquí lo ejercitamos sobre la trazabilidad.

---

*Documento vivo: actualizar después de la primera aplicación con observaciones reales del aula.*
