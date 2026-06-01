# Práctica de M3-V2 — Clase 2

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** 2 (Construcción evolutiva del agente — V2, análisis estático)
> **Versión que aplica:** M3-V2 (Code Generator + Análisis Estático)
> **Tiempo estimado:** 1h15 (15 min explicación docente + 15 min lectura de código + 25 min trabajo en parejas + 10 min puesta en común)
> **Modalidad:** parejas con su propio computador, `GROQ_API_KEY` configurada y el `venv` del Módulo 3 activo
> **Pre-requisito:** las parejas ya tienen V1 funcionando — completaron los tres `# TODO` de `agente_v1_base.py` y generaron al menos un `contract_c_v1_*.json`. También vieron en presencial la explicación conceptual de V2 (Temas 1 y 2 de la teoría: métricas de calidad de código y ISO 25010 aplicada al producto).

---

## 1. Para el docente — contexto y propósito

Esta es la segunda práctica del Módulo 3. En V1 las parejas construyeron un Code Generator que produce código y tests, y lo auditaron **a ojo** porque no tenían ninguna herramienta de medición. Salieron de esa clase incómodas: "esto no me da ninguna garantía". V2 llena ese vacío.

**El propósito pedagógico es triple:**

1. **Construir el medidor:** las parejas completan los 5 `# TODO` de `agente_v2_analisis_estatico.py` — el agente que corre radon, complexipy y Bandit sobre el código que él mismo generó, y produce el primer Quality Report estructurado por característica ISO 25010.
2. **Vivir el ablation study:** ejecutan V1 y V2 sobre el **mismo** Contract B de ejemplo y comparan. El Contract C de V1 tenía `quality_report` en `None`; el de V2 lo tiene poblado. La función que intuyeron "fea" a ojo ahora tiene un CC y un CogC concretos.
3. **Interiorizar el anti checkbox-compliance:** en `clasificar_iso_25010` el agente declara honestamente MEASURED / REQUIRES_HUMAN_JUDGMENT / NOT_APPLICABLE. No rellena las 8 características en verde. Esa honestidad es el corazón del Tema 2.

**Por qué construir es superior a solo observar.** Un estudiante puede leer que "radon mide complejidad ciclomática" y asentir. Cuando le toca escribir `ejecutar_radon` con `subprocess.run` y parsear el JSON, descubre que la herramienta es un proceso externo, que devuelve una estructura concreta, y que cruzar radon con complexipy en `construir_function_metrics` exige entender qué identifica a una función. La fricción con `clasificar_iso_25010` es la más formativa: la pareja tiene que **decidir** qué puede medir V2 y qué no — y esa decisión es ingeniería de calidad, no programación.

---

## 2. Enunciado para entregar a los estudiantes

> ### Práctica V2 — Ablation Study del Análisis Estático
>
> **Contexto:** acaban de ver en presencial cómo V2 reusa todo lo de V1 (generación vía RAG) y le agrega un paso nuevo: el agente corre herramientas de análisis estático sobre el código que generó y arma un Quality Report. El esqueleto `agente_v2_analisis_estatico.py` ya trae resuelto el volcado a disco, el ensamblado del Quality Report, el pipeline orquestador y el `main`. Faltan 5 piezas, marcadas con `# TODO`. Ustedes las construyen, ejecutan V1 y V2 sobre el mismo Contract B, y comparan.
>
> **Su tarea, en tres acciones secuenciales:**
>
> ### Acción 1 — Completar los 5 bloques `# TODO` del esqueleto (15 min)
>
> En `agente_v2_analisis_estatico.py` completen, en orden:
>
> 1. **`ejecutar_radon(code_dir)`** — corran `radon cc -j` y `radon mi -j` como `subprocess.run(..., capture_output=True)`, parseen ambas salidas JSON, devuelvan un dict con claves `"cc"` y `"mi"`.
> 2. **`ejecutar_complexipy(code_dir)`** — corran `complexipy --output-format json --quiet <code_dir>` con `subprocess.run(..., cwd=str(code_dir))`. complexipy escribe a `complexipy-results.json` en CWD (no a stdout); por eso pasamos `cwd=code_dir`. El JSON es una lista de `{complexity, file_name, function_name, path}`. Devuelvan un dict `{archivo: {función: cogc}}`.
> 3. **`ejecutar_bandit(code_dir)`** — corran `bandit -r -f json`, parseen `data["results"]`, construyan una lista de `SecurityFinding`. Mapeen `issue["issue_severity"]` con `.lower()` antes de pasarlo al enum `SecuritySeverity`. Bandit retorna exit code distinto de cero cuando encuentra hallazgos — **eso es esperado, no es un error** (no `check=True`).
> 4. **`construir_function_metrics(radon_data, complexipy_data)`** — crucen radon y complexipy en una lista de `FunctionMetrics`; calculen `exceeds_threshold = (CC >= 10) or (CogC >= 15)`.
> 5. **`clasificar_iso_25010(function_metrics, security_findings, maintainability_index)`** — construyan un `QualityCharacteristicResult` por cada una de las 8 características ISO 25010, declarando MEASURED / REQUIRES_HUMAN_JUDGMENT / NOT_APPLICABLE.
>
> ### Acción 2 — Ejecutar V1 y V2 sobre el mismo Contract B (5 min)
>
> Ejecuten `python agente_v1_base.py` y luego `python agente_v2_analisis_estatico.py`. En ambos, cuando pidan la ruta, presionen Enter para usar `examples/contract_b_login_ejemplo.json`. Abran los dos Contract C de `output/`.
>
> ### Acción 3 — Comparar V1 vs V2 y analizar el Quality Report (5 min)
>
> Construyan la tabla comparativa y respondan, leyendo el `quality_report` del Contract C de V2:
>
> - **¿Qué funciones superan umbral?** Revisen `function_metrics`: ¿cuáles tienen `exceeds_threshold: true`? ¿Coinciden con las que intuyeron "feas" en la auditoría a ojo de V1?
> - **¿Qué encontró Bandit?** Revisen `security_findings`: ¿hay hallazgos? ¿de qué severidad?
> - **¿Qué características ISO 25010 quedaron MEASURED y cuáles NOT_APPLICABLE, y por qué?** Revisen `iso_25010_coverage`: las 8 filas, cada una con su `status` y su `verdict`.
>
> ### Entregable final (al cerrar los 25 min)
>
> Un reporte breve con cuatro secciones (ver tabla en el handout de estudiantes).

---

## 3. Solución modelo (para el docente)

### Acción 1 — qué debería quedar funcionando

- **`ejecutar_radon`:** dos llamadas a `subprocess.run(["python","-m","radon","cc","-j",str(code_dir)], capture_output=True, text=True)` y la análoga con `mi`; `json.loads(resultado.stdout)` en cada una; dict `{"cc": {...}, "mi": {...}}`.
- **`ejecutar_complexipy`:** `subprocess.run(["complexipy","--output-format","json","--quiet",str(code_dir)], cwd=str(code_dir), capture_output=True, text=True)`. complexipy escribe el JSON a `complexipy-results.json` en CWD (no a stdout) — por eso pasamos `cwd=code_dir` para que el archivo caiga dentro de `code_dir`. Leer luego con `json.loads((code_dir / "complexipy-results.json").read_text())`. El JSON es una lista plana de `{complexity, file_name, function_name, path}`; reagruparla en dict `{archivo: {función: cogc_int}}`.
- **`ejecutar_bandit`:** `subprocess.run(["bandit","-r","-f","json",str(code_dir)], capture_output=True, text=True)` **sin** `check=True`; `json.loads(resultado.stdout)`; recorrer `data["results"]` y construir un `SecurityFinding` por hallazgo. El severity de Bandit viene en MAYÚSCULA (`HIGH`/`MEDIUM`/`LOW`); convertir con `.lower()` antes de instanciar el enum: `SecuritySeverity(issue["issue_severity"].lower())`.
- **`construir_function_metrics`:** recorrer `radon_data["cc"]` archivo por archivo, función por función; tomar `complexity` y `rank`; buscar el `cognitive_complexity` en `complexipy_data`; calcular `exceeds_threshold`; construir cada `FunctionMetrics`.
- **`clasificar_iso_25010`:** 8 filas. `MAINTAINABILITY` y `SECURITY` → MEASURED. `FUNCTIONAL_SUITABILITY` y `RELIABILITY` → MEASURED parcial o REQUIRES_HUMAN_JUDGMENT (V2 no corre los tests todavía). `PERFORMANCE_EFFICIENCY`, `COMPATIBILITY`, `PORTABILITY`, `USABILITY` → NOT_APPLICABLE, cada una con su `verdict` explicando por qué.

**Banderas rojas a corregir:**
- Usar `check=True` en el `subprocess.run` de Bandit — revienta con `CalledProcessError` cuando hay hallazgos, que es justo el caso interesante.
- Parsear `stderr` en vez de `stdout` — radon y Bandit escriben el JSON a `stdout`.
- Olvidar `text=True` (o `.decode()`) — `subprocess` devuelve `bytes` y `json.loads` falla.
- Rellenar las 8 características en MEASURED "para que el reporte se vea completo" — eso es exactamente el checkbox compliance que el Tema 2 combate.
- En `construir_function_metrics`, no encontrar la función en `complexipy_data` y reventar con `KeyError` en vez de usar un default razonable.

### Acción 3 — qué deberían observar en el ablation

- **El salto estructural:** el Contract C de V1 tiene `quality_report: null`. El de V2 lo tiene poblado con `function_metrics`, `maintainability_index`, `security_findings`, `iso_25010_coverage` y `functions_exceeding_threshold`. Ese es el ablation: V1 genera código, V2 mide el código que genera.
- **Funciones sobre umbral:** sobre el Contract B de login es común que 0 a 2 funciones superen umbral. Lo valioso es que las parejas las **conecten** con su auditoría a ojo de V1: "la función que dijimos que tenía ifs anidados ahora tiene CogC 16, confirmado".
- **Bandit:** sobre código de login generado, lo típico es 0 hallazgos, o hallazgos LOW (ej: uso de `assert`). Si aparece algo MEDIUM o HIGH, oro puro para la puesta en común.
- **ISO 25010:** 2 MEASURED (Maintainability, Security), 1-2 en zona gris (Functional Suitability, Reliability), 4 NOT_APPLICABLE (Performance, Compatibility, Portability, Usability). La pareja debe poder **defender** cada NOT_APPLICABLE: "Performance es runtime, el análisis estático no lo ve".

---

## 4. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Puntos | Detalle |
|---|---|---|
| **`ejecutar_radon` + `ejecutar_complexipy` correctos** | 20 | Ambas herramientas corren como subprocess, parsean el JSON, devuelven la estructura pedida. `stderr` en vez de `stdout`: −8. Falta `text=True`: −5. |
| **`ejecutar_bandit` correcto** | 15 | Corre Bandit, NO usa `check=True`, parsea `data["results"]`, construye `SecurityFinding` con severidad mapeada. Revienta con exit code de Bandit: −10. |
| **`construir_function_metrics` correcto** | 20 | Cruza radon y complexipy, calcula `exceeds_threshold = (CC>=10) or (CogC>=15)`, construye los `FunctionMetrics`. Fórmula del umbral errada: −10. `KeyError` al cruzar: −6. |
| **`clasificar_iso_25010` honesto** | 25 | Las 8 características presentes, con `status` defendible y `verdict` explicativo. Maintainability y Security MEASURED, las 4 de runtime/entorno NOT_APPLICABLE. Todo en MEASURED (checkbox compliance): −18. |
| **Ablation ejecutado y tabla comparativa** | 10 | Corrieron V1 y V2 sobre el mismo Contract B y llenaron la tabla. |
| **Análisis del Quality Report con criterio** | 10 | Las tres observaciones (funciones sobre umbral, Bandit, ISO 25010) son concretas y conectan con la auditoría a ojo de V1. Análisis genérico: −6. |

**Escalas:**
- **≥ 90 puntos:** excelente — construyeron el medidor a fondo y entienden por qué el agente declara lo que no mide.
- **70 a 89 puntos:** aprobado — completaron los 5 TODOs y el ablation con calidad razonable.
- **50 a 69 puntos:** reprobado — TODOs incompletos, o `clasificar_iso_25010` en checkbox compliance.
- **< 50 puntos:** no comprendieron V2, requieren acompañamiento individual antes de V3.

---

## 5. Puesta en común (10 minutos finales)

**Dinámica recomendada:**

1. El docente proyecta el Quality Report del Contract C de V2 de 2-3 parejas distintas.
2. Para cada uno, la clase analiza en conjunto:
   - *"¿Qué funciones superan umbral aquí? ¿Coinciden con lo que esta pareja intuyó a ojo en V1?"*
   - *"¿Bandit encontró algo? ¿De qué severidad? ¿Lo habrían visto leyendo el código?"*
   - *"Miren las 8 filas de `iso_25010_coverage`. ¿Por qué Performance quedó NOT_APPLICABLE? ¿Está bien que el agente lo declare así?"*
3. El docente cierra con los dos mensajes pedagógicos.

**Mensajes pedagógicos clave para el cierre** (decir literalmente):

> *Mensaje 1 (sobre medir lo que antes se intuía):* "En V1 auditaron a ojo y dijeron 'esta función se ve fea'. Hoy esa misma función tiene un CC y un CogC concretos. Acaban de cerrar la brecha entre la intuición y la evidencia. Eso es el ablation study: V1 genera código, V2 mide el código que genera. La intuición no escala ni es auditable; la métrica sí."

> *Mensaje 2 (sobre el anti checkbox-compliance):* "Lo más importante que construyeron hoy no es radon ni Bandit — es la honestidad de `clasificar_iso_25010`. El agente declara que NO mide Performance, NO mide Usability, NO mide Compatibility. Un agente deshonesto pondría las 8 características en verde para verse completo. El nuestro dice 'esto no lo sé medir, se necesita juicio humano o está fuera de alcance'. Esa declaración honesta es lo que un auditor CMMI L3 respeta. Un reporte que miente es peor que no tener reporte."

---

## 6. Errores típicos que vas a ver en clase (anticípate)

1. **Bandit revienta con `check=True`** (~30%). Las parejas asumen que exit code distinto de cero es error y ponen `check=True` o un `try/except` que descarta el resultado. Síntoma: V2 cae justo en el paso de Bandit. Reforzar: Bandit retorna distinto de cero **porque encontró algo** — ese es el caso que nos importa.

2. **`json.loads` falla por `bytes` o por `stderr`** (~25%). Olvidan `text=True` en `subprocess.run`, o leen `stderr` en vez de `stdout`. Recordar: el JSON de radon y Bandit va a `stdout`, y `text=True` lo entrega como string.

3. **`clasificar_iso_25010` en checkbox compliance** (~20%). Ponen las 8 características en MEASURED para que "el reporte se vea completo". Es el error conceptual más grave de la práctica — corregir en el momento, no esperar a la puesta en común.

4. **`construir_function_metrics` revienta al cruzar** (~15%). Una función está en radon pero no en complexipy (o con nombre ligeramente distinto) y el cruce lanza `KeyError`. Recordar usar `.get(...)` con un default razonable.

5. **No conectan el Quality Report con la auditoría a ojo de V1** (~10%). Llenan la tabla pero no relacionan "lo que medimos hoy" con "lo que intuimos ayer". Pedirles explícitamente: "señálenme la función que en V1 dijeron que era fea, y díganme su CogC de hoy".

---

## 7. Conexión con el resto del curso

- **Conexión con V1:** las parejas ya tenían un Contract C de V1 con `quality_report` en `None` y una auditoría a ojo. V2 convierte esa auditoría intuitiva en métricas. El ablation es con sus propios datos: el mismo Contract B, el mismo código generado, ahora medido. Esto cierra el "vacío" que V1 dejó deliberadamente abierto.

- **V3 inmediatamente después:** V2 mide el código pero todavía NO verifica trazabilidad ni coverage — `traceability_matrix` y `coverage_report` siguen en `None`. V3 los puebla: matriz bidireccional Contract B → Contract C y branch coverage con pytest-cov. La pregunta de V3 es: "ya sé que el código es mantenible, pero ¿está cada escenario probado?".

- **V4 y el HITL:** en `clasificar_iso_25010` varias características quedaron REQUIRES_HUMAN_JUDGMENT. Eso no es un defecto de V2 — es el diseño. V4 introduce al desarrollador senior que aporta exactamente ese juicio humano: naming, design intent, code smells subjetivos, Functional Appropriateness. V2 declara qué necesita un humano; V4 trae al humano.

- **Conexión con CMMI L3:** Katary obtuvo su certificación L3 con métricas calculadas manualmente y reportadas una sola vez. V2 mueve a Katary de "medición manual y puntual" a "Quality Report auto-generado dentro del contrato cada vez que el agente corre". Y la declaración honesta de MEASURED / REQUIRES_HUMAN_JUDGMENT / NOT_APPLICABLE es justo la trazabilidad de evidencia que un nivel de madurez 3 exige: no marcar verde sin sustento.

---

*Documento vivo: actualizar después de la primera aplicación con observaciones reales del aula.*
