# Práctica de M3-V1 — Clase 1

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** 1 (Construcción evolutiva del agente — V1, la línea base)
> **Versión que aplica:** M3-V1 (Code Generator base / ingenuo)
> **Tiempo estimado:** 35 minutos (25 min trabajo en parejas + 10 min puesta en común)
> **Modalidad:** parejas con su propio computador y `GROQ_API_KEY` configurada (la misma del Módulo 1)
> **Pre-requisito:** los estudiantes ya vieron en presencial la explicación conceptual de V1, leyeron el código guiado por el docente, y tienen `agente_v1_base.py` abierto en su entorno con el `venv` del Módulo 3 activo

---

## 1. Para el docente — contexto y propósito

Esta es la primera práctica del Módulo 3. **El propósito pedagógico es doble: CONSTRUIR la línea base y SENTIR su vacío.** Las parejas completan los tres bloques `# TODO` del esqueleto `agente_v1_base.py`, ejecutan el agente sobre un Contract B real, y luego auditan a ojo el Contract C que produjeron — sin ninguna herramienta de medición todavía.

**Por qué construir es superior a solo observar.** Un estudiante puede leer un agente terminado y asentir sin entender nada. Cuando le toca escribir `buscar_patrones_similares`, tiene que decidir qué texto consultar, cómo convertir distancia en similitud, qué metadata desempaquetar — y ahí es donde el RAG deja de ser una palabra y se vuelve mecánica concreta. Lo mismo con `construir_prompt`: para que el LLM devuelva `scenario_ids` correctos, la pareja debe entender que cada escenario del Contract B necesita viajar al prompt con su `acceptance_criterion_id` visible. La interiorización viene de la fricción productiva con el código.

**Por qué la auditoría a ojo es deliberadamente incómoda.** V1 NO mide complejidad, NO verifica trazabilidad, NO calcula coverage. Cuando una pareja mira su Contract C y se pregunta "¿este código está bien?" sin radon, sin matriz, sin pytest-cov, debe responder con pura inspección manual. Esa incomodidad es el objetivo: el vacío que sienten hoy es exactamente el que V2, V3 y V4 van a llenar. Si salen de esta clase pensando "esto no me da ninguna garantía", la práctica funcionó.

---

## 2. Enunciado para entregar a los estudiantes

> ### Práctica V1 — Construye la línea base + audita a ojo
>
> **Contexto:** acaban de ver en presencial cómo funciona M3-V1, el Code Generator base. El esqueleto `agente_v1_base.py` ya trae resuelto el pipeline completo (cargar el Contract B, inicializar la KB de patrones de código Katary, llamar a Groq, ensamblar el Contract C). Faltan tres piezas, marcadas con `# TODO`. Ustedes las construyen, ejecutan el agente, y auditan el resultado con sus propios ojos — sin herramientas.
>
> **Su tarea, en tres acciones secuenciales:**
>
> ### Acción 1 — Completar los tres bloques `# TODO` del esqueleto (15 min)
>
> En `agente_v1_base.py` completen, en orden:
>
> 1. **`buscar_patrones_similares(modelo, collection, feature, top_k)`** — el retrieval del RAG. Construyan el texto de consulta a partir de la `feature` (nombre, descripción, nombres de escenarios), calculen su embedding con `modelo.encode([...])`, hagan `collection.query(...)` con `n_results=top_k`, y armen la lista de patrones. Recuerden: **similitud = 1 − distancia**.
> 2. **`construir_prompt(feature, patrones)`** — el prompt enriquecido. El `system` prompt define al LLM como generador de código Python que devuelve **únicamente** un JSON con `"modules"` y `"tests"`. El `user` prompt lleva la feature con sus escenarios; **cada escenario debe llevar su `acceptance_criterion_id`** para que el LLM lo pueda referenciar en `scenario_ids`.
> 3. **`parsear_respuesta(raw_text, feature)`** — limpien el markdown del JSON, extraigan el bloque (del primer `{` al último `}`), y construyan los objetos `GeneratedCodeModule` y `GeneratedTest` a partir de `data["modules"]` y `data["tests"]`.
>
> ### Acción 2 — Ejecutar V1 sobre el Contract B de ejemplo (5 min)
>
> Ejecuten `python agente_v1_base.py` y, cuando pida la ruta, presionen Enter para usar `examples/contract_b_login_ejemplo.json` (dominio login, 4 escenarios `SCN-001` a `SCN-004`). El agente guardará un Contract C en la carpeta `output/`. Ábranlo.
>
> ### Acción 3 — Auditar a ojo el Contract C generado (5 min)
>
> Sin radon, sin pytest, sin ninguna herramienta — solo leyendo. Respondan en su reporte:
>
> - **Código:** miren el `source_code` de cada módulo en `generated_code`. ¿Hay anidamiento feo (ifs dentro de ifs dentro de fors)? ¿Funciones largas? ¿Algo que ustedes refactorizarían?
> - **Tests:** miren el `source_code` de cada test en `generated_tests`. ¿Verifican algo de verdad (asserts con valores esperados) o son `assert True` disfrazados?
> - **Trazabilidad:** revisen el campo `scenario_ids` de cada test y busquen `@pytest.mark.scenario(...)` en el código del test. ¿Los 4 escenarios `SCN-001` a `SCN-004` tienen al menos un test que los referencie? ¿Hay tests sin ningún `scenario_id`?
>
> ### Entregable final (al cerrar los 25 min)
>
> Un reporte breve con cuatro secciones (ver tabla en el handout de estudiantes).

---

## 3. Solución modelo (para el docente)

### Acción 1 — qué debería quedar funcionando

- **`buscar_patrones_similares`:** texto de consulta que concatena `feature.name`, `feature.description` y los `s.name` de cada escenario; `modelo.encode([query])`; `collection.query(query_embeddings=..., n_results=top_k)`; lista de dicts con `id`, `domain`, `quality_practices`, `typical_functions`, `common_smells`, `lessons_learned_katary` (los tres primeros vienen como string JSON en metadata, hay que `json.loads`) y `similitud = 1 - distancia`.
- **`construir_prompt`:** `system` prompt que exige JSON puro con la estructura `modules`/`tests`; `user` prompt que recorre `feature.scenarios` e imprime, por escenario, su `acceptance_criterion_id` y sus pasos Given/When/Then.
- **`parsear_respuesta`:** strip de ```` ```json ````, slice del primer `{` al último `}`, `json.loads`, y construcción de `GeneratedCodeModule(... user_story_id=feature.user_story_id)` y `GeneratedTest(... scenario_ids=item.get("scenario_ids", []))`.

**Banderas rojas a corregir:**
- Calcular `similitud = distancia` (sin el `1 -`) — invierte el ranking del RAG.
- Olvidar incluir el `acceptance_criterion_id` en el `user` prompt — el LLM no tendrá de dónde sacar los `scenario_ids` y todos los tests saldrán huérfanos.
- `parsear_respuesta` que asume JSON limpio y revienta con el ```` ``` ```` del markdown.
- Pasarle `feature` completo al `encode` en vez de un string — `SentenceTransformer` espera texto.

### Acción 3 — qué deberían observar en la auditoría

V1 es ingenuo a propósito. Lo esperable: el código suele estar **decente pero sin garantías** (puede tener una función con anidamiento de 3-4 niveles); los tests **a veces** traen asserts reales y a veces son débiles; los `scenario_ids` **frecuentemente vienen vacíos o incompletos** porque el prompt de V1 no insiste en trazabilidad. Las parejas que detecten "tengo 3 tests pero solo 1 referencia un escenario, y SCN-004 no lo prueba nadie" están viendo exactamente el vacío que V3 cierra.

---

## 4. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Puntos | Detalle |
|---|---|---|
| **`buscar_patrones_similares` correcto** | 25 | Construye query con vocabulario de la feature, hace el query a ChromaDB, similitud = 1 − distancia, desempaqueta la metadata. Similitud invertida: −15. Metadata sin `json.loads`: −10. |
| **`construir_prompt` correcto** | 25 | `system` pide JSON puro con `modules`/`tests`; `user` incluye los escenarios CON su `acceptance_criterion_id`. Sin el ID de escenario en el prompt: −15. |
| **`parsear_respuesta` correcto** | 20 | Limpia markdown, extrae el bloque JSON, construye los Pydantic con `user_story_id` y `scenario_ids`. No limpia markdown: −10. |
| **V1 ejecutado y Contract C generado** | 10 | Corrieron el agente sobre el Contract B de ejemplo y abrieron el Contract C de `output/`. |
| **Auditoría a ojo con criterio** | 20 | Las tres observaciones (código, tests, trazabilidad) son concretas y verificables, no vagas. Auditoría genérica ("se ve bien"): −12. Falta una de las tres dimensiones: −7. |

**Escalas:**
- **≥ 90 puntos:** excelente — construyeron V1 a fondo y auditaron con ojo de ingeniero de calidad.
- **70 a 89 puntos:** aprobado — completaron los TODOs y la auditoría con calidad razonable.
- **50 a 69 puntos:** reprobado — TODOs incompletos o auditoría sin sustancia.
- **< 50 puntos:** no comprendieron V1, requieren acompañamiento individual antes de V2.

---

## 5. Puesta en común (10 minutos finales)

**Dinámica recomendada:**

1. El docente proyecta el Contract C de 2-3 parejas distintas.
2. Para cada uno, la clase audita en conjunto:
   - *"¿El código tiene anidamiento que ustedes refactorizarían? ¿Cómo lo sabrían sin abrir el archivo a leer?"*
   - *"¿Estos tests verifican algo o son `assert True`? ¿Quién se los garantiza?"*
   - *"¿Cuántos de los 4 escenarios tienen test? ¿Cómo lo confirmaron — contando a mano?"*
3. El docente cierra con los mensajes pedagógicos.

**Mensajes pedagógicos clave para el cierre** (decir literalmente):

> *Mensaje 1:* "Acaban de construir un Code Generator que funciona: entra un Contract B, sale código y tests. Pero díganme con honestidad — ¿le entregarían este Contract C a un cliente de Katary? No, porque no tienen NINGUNA garantía. No saben si el código es mantenible, no saben si los tests prueban algo, no saben si los 4 escenarios están cubiertos. Tuvieron que auditar contando a mano. Eso no escala y no es auditable."

> *Mensaje 2:* "Ese vacío que sintieron no es un error del esqueleto — es el diseño de la clase. V1 es la línea base de nuestro ablation study. En V2 le metemos análisis estático: radon y complexipy van a medir lo que ustedes hoy intuyeron a ojo. En V3 llega la matriz de trazabilidad: ya no van a contar escenarios a mano, el agente lo hace y lo deja como evidencia. En V4 entra el desarrollador senior para lo que ninguna métrica ve. Hoy construyeron el 'antes'. Las próximas tres clases construyen el 'después'."

---

## 6. Errores típicos que vas a ver en clase (anticípate)

1. **Similitud invertida** (~30%). Escriben `similitud = distancia` y se confunden cuando el patrón "menos parecido" aparece de primero. Reforzar: en espacio coseno, distancia chica = más parecido, por eso `1 - distancia`.

2. **Olvidan el `acceptance_criterion_id` en el `user` prompt** (~25%). El LLM no recibe los IDs de escenario, así que todos los `scenario_ids` salen vacíos. Síntoma en la Acción 3: "ningún test referencia ningún escenario". Aprovecharlo en la puesta en común — es el puente perfecto hacia V3.

3. **`parsear_respuesta` revienta con el markdown** (~20%). El LLM devuelve ```` ```json ... ``` ```` y el `json.loads` falla. Recordar: limpiar primero, extraer del primer `{` al último `}`.

4. **No desempaquetan la metadata de ChromaDB** (~15%). `quality_practices`, `typical_functions` y `common_smells` se guardaron como string JSON; hay que `json.loads` al leerlos. Sin eso, el prompt recibe strings crudos.

5. **Auditoría a ojo vaga** (~10%). Escriben "el código está bien" sin mirar de verdad. Pedirles algo concreto: "señálenme la función más anidada y díganme cuántos niveles tiene".

---

## 7. Conexión con el resto del curso

- **V2 inmediatamente después:** las parejas ya tienen un Contract C generado por SU propio V1. Cuando V2 corra radon, complexipy y Bandit sobre ese mismo código, van a poder comparar su auditoría a ojo contra los números reales. Las funciones que intuyeron "feas" hoy van a tener un CC y un CogC concretos mañana — eso convierte V2 en un ablation study con sus propios datos.

- **V3 y la trazabilidad:** el vacío de `scenario_ids` que detecten hoy es exactamente lo que V3 mide y reporta en la `TraceabilityMatrix`. Hoy cuentan escenarios a mano; en V3 el agente genera la matriz bidireccional automáticamente.

- **Módulo 4 (Functional Tester):** el Contract C que produce este agente es la entrada del Módulo 4. Un Contract C de V1, sin garantías, le pasaría basura al siguiente agente del pipeline. Por eso el módulo entero existe: blindar el contrato antes de que avance.

- **Conexión con CMMI L3:** Katary obtuvo su certificación L3 presentando una matriz Excel hecha a mano, una sola vez. Auditar a ojo, como hicieron hoy, es precisamente esa práctica no sostenible. El Módulo 3 mueve a Katary de "auditoría puntual y manual" a "matriz auto-generada y continua dentro del contrato". Hoy vivieron el problema; el resto del módulo construye la solución.

---

*Documento vivo: actualizar después de la primera aplicación con observaciones reales del aula.*
