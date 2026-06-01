# Práctica V4 — Calibración inter-revisores en HITL

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** V4 — `review_cli_dev.py`, el desarrollador senior dentro del pipeline
> **Tiempo:** 25 minutos de práctica (individual + parejas) + 10 minutos de puesta en común
> **Modalidad:** primero individual (cada estudiante revisa solo), después en parejas (compararse y proponer)

---

## Contexto

Acaban de ver cómo V4 incorpora al **desarrollador senior humano** dentro del pipeline (HITL — Human-in-the-Loop). La herramienta es `review_cli_dev.py` y **no es un agente generador**: es la manera de que un humano revise el Contract C, deje sus decisiones registradas y lo firme.

V2 y V3 midieron lo **objetivo** — CC, CogC, MI, branch coverage, trazabilidad. Pero hay cosas que **ninguna herramienta mide**: el *naming* (¿los nombres reflejan la intención?), el *design intent* (¿la estructura cuenta una historia coherente?), los *code smells subjetivos* (acoplamiento sutil, abstracciones prematuras) y la *Functional Appropriateness* (¿resuelve el problema real?). Eso solo lo juzga un humano.

Hoy van a **construir** esa herramienta — completando 2 bloques `# TODO` del esqueleto — y después van a **ser** ese desarrollador senior. Y van a descubrir algo incómodo: **el humano también es inconsistente.** Esa inconsistencia, sin proceso para gestionarla, es el siguiente eslabón débil del pipeline después del LLM.

**V4 no garantiza que el código sea perfecto. V4 lo hace defendible.** Eso es lo que CMMI-DEV L3 exige.

---

## Las 3 acciones que van a hacer

### Acción 1 — Completar el esqueleto y revisar individualmente

> **Tiempo:** 10 minutos
> **Modalidad: cada estudiante en su computador. NO se hablen entre ustedes durante esta acción.**

**Primero, completen los 2 `# TODO` de `review_cli_dev.py`:**

1. **`registrar_decision(review, reviewer, action, target, notes)`** — construyan un objeto `ReviewChange` con el timestamp actual (`datetime.now(...)`), el `reviewer`, la `action`, el `target` y las `notes`; luego agréguenlo a `review.change_history`. Esta función es el corazón de la auditabilidad CMMI L3: cada decisión queda registrada con quién, cuándo, sobre qué y por qué. Si no hacen el `append`, la decisión se pierde.

2. **`aplicar_veredicto(review, reviewer, veredicto, feedback)`** — según el `veredicto`:
   - `'aprobar'` → `review.review_status = ReviewStatus.APPROVED`, `review.approved_by = reviewer`, `review.approved_at = ahora`.
   - `'rechazar'` → `review.review_status = ReviewStatus.REJECTED`.
   - `'cambios'` → `review.review_status = ReviewStatus.NEEDS_CHANGES`, `review.version += 1`.
   - En los **tres** casos: guarden `review.reviewer_feedback = feedback` y llamen a `registrar_decision(...)` para dejar la firma en el `change_history`.

   Sin `review_status == APPROVED`, el Contract C **no avanza al Módulo 4**.

El esqueleto ya trae el resto (GIVEN): `cargar_contract_c`, `listar_contracts_c_disponibles`, `mostrar_resumen`, el bucle `revisar_interactivo` y el `main`. No los toquen.

**Después, ejecuten la herramienta:**

```bash
python review_cli_dev.py
```

Identifíquense con su nombre (formato `nombre.apellido`) y seleccionen el `contract_c_v3_*.json` más reciente de `output/` (o el que indique el docente). Recorran los módulos de código **uno por uno**. Por cada módulo decidan:

- `[a]` aceptar el módulo
- `[c]` comentar / marcar un smell (dejen su observación como revisor senior)
- `[s]` saltar

Al final, den el **veredicto final**: `[a]` aprobar, `[r]` rechazar o `[n]` solicitar cambios, con un comentario libre.

**Importante:** apliquen su criterio personal sobre naming, design intent, smells y appropriateness, **sin consultar a su pareja**. Si dudan, decidan rápido y dejen la nota. La inconsistencia entre criterios es justo lo que vamos a estudiar después.

Cuando termine, anoten:
- Cuántos módulos marcaron como smell
- Su veredicto final
- El path del archivo `_reviewed.json` que generó la herramienta

---

### Acción 2 — Tabla de discrepancias en pareja

> **Tiempo:** 8 minutos
> **Modalidad: ahora SÍ en pareja. Junten sus computadores.**

Abran los DOS archivos `*_reviewed.json` (uno por cada quien). Recorran el `change_history` de cada uno y construyan esta tabla — **solo los módulos donde sus decisiones difirieron** (uno marcó smell y el otro no, o difirió el veredicto):

| Módulo (`filename`) | Decisión A | Decisión B | Criterio de cada quien | ¿Ambos defendibles? |
|---|---|---|---|---|
| | | | | |

> *Pista:* en naming, design intent y code smells subjetivos casi nunca hay una respuesta universalmente correcta. Anoten *"ambos defendibles con criterio diferente"* cuando aplique — esa honestidad vale.

**Reflexionen dos minutos en pareja:**

- ¿En cuántos módulos difirieron?
- ¿Sus notas en el `change_history` son lo suficientemente claras para que un tercero entienda por qué cada quien decidió lo que decidió?
- Si **ustedes dos** difieren tanto, ¿qué pasaría con un equipo de 5 desarrolladores senior en Katary revisando el mismo Contract C?

---

### Acción 3 — Diseñar un protocolo de calibración

> **Tiempo:** 7 minutos
> **Modalidad: en pareja, juntos.**

Como pareja, **propongan un protocolo concreto** que Katary podría implementar para reducir la inconsistencia entre revisores senior. Aterricen al menos **dos elementos** de este menú (o inventen los suyos):

- Una **lista de reglas operativas** (3-5 reglas) que todo revisor senior aplica. Ejemplo: *"Un nombre de función que no contiene un verbo de dominio se marca como smell de naming."*
- Un **set de código canónico ground-truth** — módulos ya etiquetados contra los que un revisor nuevo se calibra antes de tocar producción.
- Un **protocolo de doble revisión** para módulos borderline (ambos revisores tienen que coincidir).
- Un **arbitraje de líder técnico** cuando dos revisores no coinciden.

Escriban la propuesta en su reporte — **concreta, no abstracta**. Si proponen "reglas", escriban las reglas. Si proponen "ground-truth", den un ejemplo.

> *Reflexión:* el problema no se resuelve con un agente más listo ni con un revisor más experto. Se resuelve con un proceso de QA más maduro.

---

## Entregable final

Al cerrar los 25 minutos, cada pareja prepara un reporte breve:

| Sección | Contenido |
|---|---|
| **1. Mi revisión individual** | Cada estudiante: # módulos marcados como smell, veredicto final, path del `_reviewed.json` generado (Acción 1) |
| **2. Tabla de discrepancias** | La tabla de módulos donde difirieron, con el criterio de cada quien (Acción 2) |
| **3. Protocolo de calibración propuesto** | Mecanismo concreto, mínimo dos elementos aterrizados (Acción 3) |
| **4. Lección personal** | ¿Cuál es la diferencia real entre HITL y "tener un humano que revisa"? Conecten con el `change_history` y con CMMI L3 |

---

## Comandos útiles

**Ejecutar la herramienta de revisión:**
```bash
python review_cli_dev.py
```

**Activar el venv si no está activo:**
```bash
# PowerShell (Windows)
.\venv\Scripts\Activate.ps1

# bash (Linux/Mac)
source venv/bin/activate
```

**Ver el `change_history` rápido:**
Abran el `*_reviewed.json` y busquen `"change_history"` con `Ctrl+F`. Cada entrada tiene `timestamp`, `reviewer`, `action`, `target` y `notes`.

**Comparar dos JSON en pareja:**
```bash
code --diff archivo_A_reviewed.json archivo_B_reviewed.json
```

---

## Recordatorio

Esta práctica las pone **en el rol del desarrollador senior dentro del pipeline** — no como espectadoras, como protagonistas. La calidad de su reporte depende de tres cosas:

1. Que sus **TODOs funcionen** — `registrar_decision` debe agregar el `ReviewChange` al `change_history`, y `aplicar_veredicto` debe actualizar `review_status` *y* registrar la firma.
2. Que su **revisión individual sea genuina** — apliquen su criterio sobre naming, design y smells, no copien a la pareja ni intenten ser "perfectas". La inconsistencia es el dato.
3. Que su **protocolo de calibración sea aterrizado** — que un revisor nuevo de Katary pueda leerlo y aplicarlo al día siguiente.

**Pregunten al docente cualquier duda durante los 25 minutos. La puesta en común al final es para compartir hallazgos, no para resolver dudas básicas.**
