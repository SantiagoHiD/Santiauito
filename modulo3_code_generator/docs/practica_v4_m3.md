# Práctica V4 — Calibración inter-revisores en HITL (guía docente)

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Clase:** V4 — `review_cli_dev.py`, el desarrollador senior dentro del pipeline
> **Versión:** M3-V4
> **Tiempo estimado:** 1h15 (15 min explicación docente + 15 min lectura de código + 25 min práctica en parejas + 10 min puesta en común)
> **Modalidad:** primero individual (cada estudiante revisa solo), después en parejas (compararse y proponer)
> **Pre-requisito:** tener un Contract C de V3 generado y guardado en `output/contract_c_v3_*.json`
> **Handout asociado para estudiantes:** `practica_v4_m3_estudiantes.md`

---

## 1. Para el docente — contexto y propósito

V4 cierra el Módulo 3. No es un agente generador: es `review_cli_dev.py`, la herramienta que incorpora al **desarrollador senior humano DENTRO del pipeline** (HITL — Human-in-the-Loop).

El concepto nuevo que esta clase instala: V2 y V3 midieron lo **objetivo** — CC, CogC, MI, branch coverage, trazabilidad CMMI L3. Pero hay cosas que **ninguna herramienta mide**:

- **naming** — ¿los nombres reflejan la intención o son genéricos y mienten?
- **design intent** — ¿la estructura del código cuenta una historia coherente?
- **code smells subjetivos** — acoplamiento sutil, abstracciones prematuras, generalización que nadie pidió.
- **Functional Appropriateness** — ¿la solución resuelve el problema real del escenario, o resuelve otro parecido?

El desarrollador senior revisa el Contract C, deja sus decisiones en el `change_history` (auditable para CMMI L3) y **firma**: aprueba, rechaza o solicita cambios. Sin `review_status == APPROVED`, el Contract C no avanza al Módulo 4.

Frase que debe quedar instalada: **"V4 no garantiza que el código sea perfecto. V4 lo hace DEFENDIBLE."**

En esta práctica las estudiantes primero **construyen** la herramienta (completan 2 bloques `# TODO` del esqueleto `review_cli_dev.py`) y después **son** el desarrollador senior. El esqueleto ya trae GIVEN: `cargar_contract_c`, `listar_contracts_c_disponibles`, `mostrar_resumen`, el bucle `revisar_interactivo` y el `main`. Las estudiantes completan:

1. `registrar_decision(review, reviewer, action, target, notes)` — construir un `ReviewChange` (timestamp actual, reviewer, action, target, notes) y agregarlo a `review.change_history`. Es el corazón de la auditabilidad CMMI L3.
2. `aplicar_veredicto(review, reviewer, veredicto, feedback)` — según veredicto: `aprobar` → `review_status = APPROVED` + `approved_by` + `approved_at`; `rechazar` → `REJECTED`; `cambios` → `NEEDS_CHANGES` + `version += 1`. En los tres: guardar `reviewer_feedback` y registrar la decisión en el `change_history`.

**El espejo del docente.** La pieza pedagógica más potente de la clase: JuanCa hace su **propia revisión real** de un Contract C frente a la clase, con `review_cli_dev.py`, y muestra sus **propias inconsistencias** — un módulo que marcó como smell y otro casi idéntico que aprobó sin nota, un naming que toleró aquí y rechazó allá. No las presenta como defecto personal, sino como **material pedagógico**: 19 años de experiencia y la revisión sigue siendo inconsistente. Ese es exactamente el punto. La inconsistencia del revisor humano es el siguiente eslabón débil del pipeline después del LLM, y se gestiona con proceso, no con talento.

---

## 2. Enunciado para entregar a los estudiantes

> **Acción 1 — Completar el esqueleto y revisar individualmente (individual, 10 min).**
> Completen los 2 `# TODO` de `review_cli_dev.py` (`registrar_decision` y `aplicar_veredicto`). Ejecuten la herramienta sobre el Contract C de V3 que tienen en `output/`. Recorran los módulos de código uno por uno y, **sin hablar con su pareja**, apliquen su criterio personal sobre naming, design intent, code smells y appropriateness: aceptar `[a]`, marcar smell `[c]` o saltar `[s]`. Cierren con el veredicto final. Anoten cuántos módulos marcaron, su veredicto y el path del `_reviewed.json` generado.
>
> **Acción 2 — Tabla de discrepancias en pareja (en pareja, 8 min).**
> Junten sus dos `*_reviewed.json`. Recorran los `change_history` de ambos y construyan una **tabla de discrepancias**: los módulos donde uno marcó algo que el otro no, o donde difirió el veredicto. Para cada discrepancia anoten qué criterio usó cada quien y si ambos son defendibles.
>
> **Acción 3 — Diseñar un protocolo de calibración (en pareja, 7 min).**
> Como pareja, propongan un protocolo concreto que Katary podría implementar para reducir la inconsistencia entre revisores senior. Aterricen al menos **dos elementos**: lista de reglas operativas, set de código canónico ground-truth, protocolo de doble revisión, arbitraje de líder técnico. Concreto, no abstracto: si proponen reglas, escriban las reglas.

---

## 3. Solución modelo (para el docente)

**Qué deberían lograr en los TODOs.**

- `registrar_decision`: instanciar `ReviewChange(timestamp=datetime.now(...), reviewer=reviewer, action=action, target=target, notes=notes)` y hacer `review.change_history.append(...)`. Error a vigilar: olvidar el `append` (construyen el objeto y lo pierden) o pasar un string en vez del objeto `ReviewChange`.
- `aplicar_veredicto`: tres ramas sobre `veredicto`. En las tres, `review.reviewer_feedback = feedback` y `registrar_decision(...)` con una `action` que describa el veredicto. En `aprobar` además `review.review_status = ReviewStatus.APPROVED`, `review.approved_by = reviewer`, `review.approved_at = datetime.now(...)`. En `cambios`, `review.version += 1`. Error a vigilar: aplicar el veredicto pero no registrar nada en el `change_history` — la firma queda sin huella.

**Qué discrepancias esperar en la revisión.** Sobre un mismo Contract C de V3, dos estudiantes típicamente difieren en 2 a 6 módulos. Lo común: una marca como smell un nombre genérico (`procesar`, `data`, `handler`) que la otra tolera; una considera "abstracción prematura" un helper que la otra ve como buena factorización; una rechaza por appropriateness un módulo que la otra aprueba porque "técnicamente cumple el escenario". El veredicto final también puede divergir: aprobar vs solicitar cambios sobre el mismo artefacto.

**Por qué no hay respuesta única.** Naming, design intent y code smells subjetivos no tienen métrica ni umbral. Dos revisores senior, ambos competentes, pueden leer el mismo módulo y emitir juicios distintos y **ambos defendibles**. Ese es justamente el dato que la práctica busca exponer. La conclusión correcta no es "una se equivocó", sino "el proceso necesita un mecanismo para alinear criterios". Si las estudiantes llegan ahí, V4 cumplió su misión.

---

## 4. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Insuficiente (0-12) | Aceptable (13-18) | Sobresaliente (19-25) |
|---|---|---|---|
| **TODOs completados y funcionando** | `review_cli_dev.py` no corre o lanza `NotImplementedError` | Corre, pero el `change_history` queda incompleto o el veredicto no actualiza `review_status` | Ambos TODOs correctos: `registrar_decision` agrega `ReviewChange` completo; `aplicar_veredicto` cubre las 3 ramas y registra en el `change_history` |
| **Revisión individual genuina (Acción 1)** | Acepta todo o marca todo sin criterio | Marca algunos módulos con criterio implícito | Marca con criterio claro sobre naming/design/smells/appropriateness, notas defendibles, veredicto coherente |
| **Tabla de discrepancias honesta (Acción 2)** | No detectan diferencias o las minimizan | Detectan diferencias pero no explican el criterio | Detectan, listan y explican con qué criterio difirió cada quien; reconocen cuándo ambos son defendibles |
| **Protocolo de calibración aterrizado (Acción 3)** | Propuesta vaga o filosófica | Dos elementos, pero superficiales | Dos elementos concretos y accionables, con reglas escritas o ejemplos de ground-truth |

**Aprobación de la práctica:** mínimo 60/100 en la suma.

---

## 5. Puesta en común (10 minutos finales)

**Dinámica.**

1. (1 min) *"Levanten la mano las parejas que encontraron al menos un módulo donde sus decisiones difirieron."* Casi todas la levantan.
2. (3 min) Una pareja voluntaria expone su discrepancia más fuerte: qué dijo cada quien y por qué. No corregir — dejar el caso abierto.
3. (3 min) **El espejo del docente.** Abrir en pantalla el `_reviewed.json` propio del docente y mostrar el `change_history`. Señalar 2 o 3 inconsistencias reales propias.
4. (2 min) Una o dos parejas comparten su protocolo de calibración. Premiar el más concreto.
5. (1 min) Cierre conceptual del Módulo 3.

**Mensajes pedagógicos para decir literalmente.**

> *"Si yo, después de 19 años en software, hago revisiones inconsistentes sobre un Contract C de pocos módulos — ¿qué les hace pensar que un equipo de senior en Katary lo hará perfecto sin proceso? La inconsistencia humana no es un defecto personal, es un dato del sistema. Por eso V4 trae trazabilidad, no infalibilidad."*

> *"HITL no es 'tener un humano que revisa'. HITL es revisión humana con trazabilidad estructurada en el mismo artefacto que viaja por el pipeline. El `change_history` con timestamp, reviewer, action y notes ES la diferencia entre proceso y buena intención."*

> *"V4 no garantiza que el código sea perfecto. V4 lo hace defendible. Y 'defendible' es lo que una auditoría CMMI L3 te exige — no humanos infalibles, procesos auditables."*

---

## 6. Errores típicos que vas a ver en clase (anticípate)

1. **(~60%) Construyen el `ReviewChange` pero no lo agregan al `change_history`** — el objeto se crea y se pierde. Falta el `review.change_history.append(...)`. Síntoma: el `_reviewed.json` sale con `change_history` vacío.
2. **(~40%) `aplicar_veredicto` actualiza `review_status` pero no registra la decisión** — la firma queda sin huella en el `change_history`. Recordar: el veredicto también es una decisión auditable.
3. **(~35%) Olvidan `version += 1` en la rama `cambios`** — `NEEDS_CHANGES` sin incrementar versión rompe la trazabilidad del ciclo de re-trabajo.
4. **(~30%) Empiezan a hablar con la pareja durante la Acción 1** — la revisión individual debe ser silenciosa; la comparación viene después.
5. **(~30%) Parálisis en un módulo** ("¿es smell o no?") — decirles: decide rápido con tu criterio, deja la nota, sigue. La inconsistencia es el dato.
6. **(~25%) Concluyen "mi compañera se equivocó"** — reencauzar: si la justificación es defendible, no se equivocó, aplicó otro criterio.
7. **(~20%) Protocolo de calibración vago** ("haremos reuniones para alinear") — pedir aterrizaje: ¿qué reglas?, ¿con qué frecuencia?, ¿quién arbitra?
8. **(~15%) Pasan `target` o `notes` en orden incorrecto** a `registrar_decision` — revisar la firma de la función en el esqueleto.

---

## 7. Conexión con el resto del curso

**Con V3.** V3 entregó un Contract C con métricas objetivas y matriz de trazabilidad CMMI L3. Pero V3 no puede decir si un nombre miente o si una abstracción sobra. V4 es la respuesta concreta a esa limitación: agrega el juicio humano que ninguna herramienta sustituye, y lo deja trazable.

**Con el Módulo 4.** El `review_status == APPROVED` es la **compuerta** entre el Módulo 3 y el Módulo 4. Sin firma del desarrollador senior, el Contract C no avanza. V4 no es opcional ni decorativo: es el único punto del pipeline donde el resultado se firma.

**Con CMMI L3.** El `change_history` con `timestamp + reviewer + action + target + notes` es exactamente la evidencia que una auditoría CMMI-DEV L3 exige: decisiones de revisión auditables, no humanos infalibles. Katary obtuvo su certificación con una matriz Excel puntual; este pipeline produce trazabilidad continua y auto-generada.

**Cierre del Módulo 3.** Esta práctica cierra el módulo completo. Las cuatro versiones del Code Generator Agent:

> **V1 escribe. V2 mide. V3 traza. V4 juzga.**

Si esa frase queda instalada — y con ella la idea de que el juicio humano es necesario *y* falible *y* por eso debe ser trazable — el Módulo 3 cumplió.

---

*Documento vivo: actualizar después de la primera aplicación con observaciones reales del aula.*
