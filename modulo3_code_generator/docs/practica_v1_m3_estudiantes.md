# Práctica V1 — Construye la línea base + audita a ojo

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** 1
> **Tiempo:** 35 minutos (25 min en parejas + 10 min puesta en común)
> **Modalidad:** parejas con su propio computador y `GROQ_API_KEY` configurada (la misma del Módulo 1)

---

## Contexto

Acaban de ver en presencial el agente **M3-V1**, el **Code Generator base**. Ya saben qué hace: recibe un Contract B del Módulo 2 (escenarios Gherkin) y produce un Contract C con código Python + tests Pytest, usando RAG sobre la base de conocimiento de patrones de código del SGC Katary.

El esqueleto `agente_v1_base.py` ya viene casi completo: el pipeline, la carga del Contract B, la inicialización de la KB, la llamada a Groq y el ensamblado del Contract C están **resueltos**. Faltan **tres piezas**, marcadas con `# TODO`. Ustedes las construyen, ejecutan el agente, y después **auditan el resultado con sus propios ojos** — sin radon, sin pytest, sin ninguna herramienta todavía.

V1 es deliberadamente ingenuo: no mide calidad, no verifica trazabilidad, no calcula coverage. El objetivo de hoy es que construyan esa línea base y **sientan qué le falta**. Ese vacío es lo que las próximas clases van a llenar.

---

## Las 3 acciones que van a hacer

### Acción 1 — Completar los tres bloques `# TODO` del esqueleto (15 min)

Abran `agente_v1_base.py`. Completen, **en orden**, los tres bloques marcados con `# TODO`:

**1. `buscar_patrones_similares(modelo, collection, feature, top_k)`** — el retrieval del RAG.

- Construyan el texto de consulta a partir de la `feature`: usen `feature.name`, `feature.description` y los nombres de los escenarios (`feature.scenarios`). Mientras más vocabulario relevante, mejor recupera el RAG.
- Calculen el embedding con `modelo.encode([...])`.
- Llamen a `collection.query(...)` con `n_results=top_k`.
- Armen la lista de patrones, cada uno con: `id`, `domain`, `quality_practices`, `typical_functions`, `common_smells`, `lessons_learned_katary` y `similitud`.
- **Clave:** la `similitud = 1 - distancia`. Y ojo: `quality_practices`, `typical_functions` y `common_smells` están guardados en la metadata como texto JSON — hay que convertirlos de vuelta con `json.loads`.

**2. `construir_prompt(feature, patrones)`** — el prompt enriquecido con RAG.

- El **`system` prompt** define al LLM como un generador de código Python. Debe devolver **únicamente** un JSON con esta estructura: una lista `"modules"` (cada uno con `filename`, `source_code`, `description`) y una lista `"tests"` (cada uno con `test_name`, `source_code`, `target_module`, `scenario_ids`).
- El **`user` prompt** lleva la feature: nombre, descripción, `user_story_id`, y cada escenario con sus pasos Given/When/Then. **IMPORTANTE:** incluyan el `acceptance_criterion_id` de cada escenario, para que el LLM lo pueda referenciar en `scenario_ids`. Sin ese ID en el prompt, el LLM no tiene de dónde sacar la trazabilidad.
- Devuelve la tupla `(system_prompt, user_message)`.

**3. `parsear_respuesta(raw_text, feature)`** — convertir el JSON crudo del LLM en objetos del Contract C.

- Limpien el texto si viene en markdown (```` ```json ... ``` ````).
- Extraigan el bloque JSON: del primer `{` al último `}`.
- Por cada item de `data["modules"]`, construyan un `GeneratedCodeModule` (pásenle `user_story_id=feature.user_story_id`).
- Por cada item de `data["tests"]`, construyan un `GeneratedTest` (incluyan `scenario_ids` tal como el LLM los devolvió — en V1 puede venir vacío o incompleto, eso es esperado).
- Devuelve la tupla `(list[GeneratedCodeModule], list[GeneratedTest])`.

---

### Acción 2 — Ejecutar V1 sobre el Contract B de ejemplo (5 min)

Ejecuten el agente:

```
python agente_v1_base.py
```

Cuando pida la ruta del Contract B, **presionen Enter** para usar el ejemplo incluido: `examples/contract_b_login_ejemplo.json`. Es un Contract B del dominio **login**, con 4 escenarios: `SCN-001` (login exitoso), `SCN-002` (rechazo de inyección SQL), `SCN-003` (contraseña incorrecta) y `SCN-004` (bloqueo tras 5 intentos).

El agente guardará un archivo `contract_c_v1_<timestamp>.json` en la carpeta `output/`. **Ábranlo** — ese es el objeto que van a auditar.

---

### Acción 3 — Auditar a ojo el Contract C generado (5 min)

Sin herramientas. Solo leyendo el JSON del Contract C. Respondan estas tres preguntas:

1. **El código** — miren el `source_code` de cada módulo en `generated_code`. ¿Hay anidamiento feo (ifs dentro de ifs dentro de fors)? ¿Funciones largas que harían difícil mantener? ¿Algo que ustedes refactorizarían antes de entregarlo?
2. **Los tests** — miren el `source_code` de cada test en `generated_tests`. ¿Verifican algo de verdad (asserts contra valores esperados) o son `assert True` disfrazados de test?
3. **La trazabilidad** — revisen el campo `scenario_ids` de cada test, y busquen `@pytest.mark.scenario(...)` dentro del código de cada test. ¿Los 4 escenarios `SCN-001` a `SCN-004` tienen al menos un test que los referencie? ¿Hay tests que no referencien ningún escenario?

No hay respuesta "correcta" preestablecida — V1 es ingenuo y el resultado varía. Lo que importa es que **miren de verdad** y anoten lo que ven.

---

## Entregable final

Al terminar, cada pareja prepara un reporte breve con:

| Sección | Contenido |
|---|---|
| **1. Los tres TODOs** | Confirmen que completaron `buscar_patrones_similares`, `construir_prompt` y `parsear_respuesta`, y que V1 corrió sin errores |
| **2. Auditoría del código** | ¿Encontraron anidamiento feo o funciones largas? Señalen la función concreta y por qué la refactorizarían |
| **3. Auditoría de los tests** | ¿Los tests verifican algo real o son débiles? Den un ejemplo concreto del Contract C |
| **4. Auditoría de trazabilidad** | ¿Cuántos de los 4 escenarios `SCN-001` a `SCN-004` tienen test? ¿Hay tests sin `scenario_id`? ¿Cómo lo confirmaron? |
| **5. Una lección personal** | ¿Qué garantía de calidad le FALTA a V1 que ustedes sintieron auditando a ojo? |

---

## Comandos útiles

**Ejecutar V1:**
```
python agente_v1_base.py
```

**Activar el venv si no está activo:**
```
# En PowerShell (Windows)
.\venv\Scripts\Activate.ps1

# En bash (Linux/Mac)
source venv/bin/activate
```

**Si modificaron la KB de patrones y necesitan reindexar** (no es necesario para esta práctica, pero por si acaso):
```
# En PowerShell (Windows)
Remove-Item -Recurse -Force knowledge_base_data

# En bash (Linux/Mac)
rm -rf knowledge_base_data
```

---

## Recordatorio

Hoy construyen un Code Generator que **funciona** — pero que no les da **ninguna garantía**. Esa es la idea. Auditar a ojo es incómodo, no escala y no es auditable: tuvieron que contar escenarios a mano y adivinar si el código es mantenible. Guarden esa incomodidad. En V2 las herramientas van a medir lo que hoy intuyeron, en V3 la matriz de trazabilidad va a reemplazar el conteo manual, y en V4 entra el desarrollador senior para lo que ninguna métrica ve.

La calidad de su reporte depende de que **miren de verdad** el Contract C — no de adivinar. Señalen funciones concretas, citen tests concretos, cuenten escenarios uno por uno.

¡Manos al código!
