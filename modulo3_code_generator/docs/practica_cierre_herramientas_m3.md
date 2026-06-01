# Práctica de cierre — Aplicar las herramientas a código ajeno (VERSIÓN DOCENTE)

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Cierre de temas teóricos antes de los agentes V1-V4
> **Tiempo:** 40 minutos en parejas + 10 minutos de puesta en común
> **Pareo con:** `examples/practica_cierre/gestor_pedidos.py` + `test_gestor_pedidos.py`

---

## 1. Propósito pedagógico

Esta es la práctica **bisagra** entre la teoría y los agentes. Las parejas ya vieron CC, CogC, MI, ISO 25010, trazabilidad y coverage en teoría. Anoche aplicaron las herramientas a código que ellas mismas escribieron. **Hoy aplican las herramientas a código ajeno** — un módulo que el docente les entrega, deliberadamente diseñado con tres perfiles distintos de complejidad y con cobertura incompleta.

**Por qué código ajeno:** en su trabajo profesional rara vez van a medir su propio código en frío. Van a medir el código que un LLM produjo (lo de mañana con V1), código heredado, o código de colegas. Esta práctica las pone en ese modo: leer, medir, diagnosticar, decidir.

**Por qué este módulo concreto:** `gestor_pedidos.py` tiene tres funciones diseñadas para que las herramientas devuelvan información distinta de cada una. Es un caso pequeño pero pedagógicamente denso.

---

## 2. Lo que las parejas van a encontrar (datos confirmados)

He medido el módulo. Estos son los números reales que las parejas deben obtener:

### radon cc

```
gestor_pedidos.py
    F 46:0 calcular_envio - C (12)
    F 24:0 estado_pedido  - B (9)
    F 13:0 validar_pedido - A (5)
```

### radon mi

```
gestor_pedidos.py - A (57.93)
```

### complexipy

| Función | CogC |
|---|---|
| `validar_pedido` | 4 |
| `estado_pedido` | 9 |
| `calcular_envio` | **40** (FAILED, sobre el umbral) |

### pytest --cov-branch

```
Name                Stmts   Miss Branch BrPart  Cover   Missing
---------------------------------------------------------------
gestor_pedidos.py      51     16     44     12    64%   29, 31, 33, 35, 39, 41, 49->77, 52-58, 63, 64->75, 69-74
10 passed
```

---

## 3. La tabla maestra para mostrar en la puesta en común

| Función | CC | banda | CogC | Gap CogC−CC | Lectura ingeniera |
|---|---|---|---|---|---|
| `validar_pedido` | 5 | A | 4 | −1 | Simple. Se queda como está. |
| `estado_pedido` | 9 | B | 9 | 0 | Plana: muchos elif pero sin anidamiento. CC y CogC casi iguales. Refactor opcional (dict de mapeo), no urgente. |
| `calcular_envio` | 12 | C | **40** | **+28** | El gap más grande del módulo. CC ya pasa el umbral (>=10) y CogC explota por el anidamiento profundo. **Refactor obligatorio.** |

**Maintainability Index del archivo:** 57.93 banda A — el archivo en promedio es mantenible, pero el promedio esconde que `calcular_envio` está rota internamente. **Lección importante: el MI a nivel archivo puede ocultar problemas por función.**

**Cobertura branch:** 64%, debajo del umbral 80%. Las ramas no cubiertas son casi todas adentro de `calcular_envio` (líneas 49-74), confirmando lo que las métricas ya dijeron: esa función es donde se concentra el problema.

---

## 4. Paso a paso para el docente

### Apertura (2 min)

> "Anoche midieron código que ustedes escribieron. Hoy van a medir código ajeno — un módulo que les estoy entregando. Esto es ensayo para mañana: porque V1 va a generar código que ustedes nunca escribieron, y van a tener que decidir si confiar o no en él. Mismas herramientas, otro código. Vamos."

Reparta la carpeta `examples/practica_cierre/` o asegúrese de que esté en el repo del estudiante.

### Mientras trabajan (40 min)

Recorra las parejas. **Errores típicos que va a ver:**

1. **Olvidan correr `--cov-branch`.** El reporte default solo mide line coverage. Hay que insistir en branch — es lo que detecta los `else` no probados.
2. **Confunden MI banda A con "todo está bien".** El archivo está en A, pero `calcular_envio` adentro está roto. Si una pareja dice "todo está bien porque MI = A", pídale que mire los datos por función. Es la lección: el MI a nivel archivo PROMEDIA, y promediar oculta.
3. **Predicen mal el gap CogC−CC.** Casi todas las parejas a ojo van a decir que `estado_pedido` (los 8 `elif`) es la "más fea". Cuando vean que CogC de esa función es 9 (igual al CC), van a sorprenderse. Y cuando vean que `calcular_envio` da CogC=40, ahí van a entender qué mide CogC realmente.
4. **No relacionan cobertura con complejidad.** Las ramas Missing (49-77) están casi todas en `calcular_envio`. Esa función no solo es la más compleja: también es la menos probada. **Dos señales que convergen — eso es lo defendible.**

### Puesta en común (10 min)

Proyecte la tabla maestra (sección 3 arriba) y haga estas preguntas:

1. **"Cuál función predijeron como la peor a ojo? Cuál fue realmente la peor según las herramientas?"** → Casi todas van a decir `estado_pedido` y se van a sorprender al ver que `calcular_envio` con CC=12 y CogC=40 fue mucho peor. **Lección:** la legibilidad anidada es más cara cognitivamente que la legibilidad de muchos elif planos. CogC lo cuantifica.

2. **"Por qué `calcular_envio` tiene un gap CogC−CC de +28? Tan grande?"** → Por los **4 niveles de anidamiento**. CC suma 1 por cada rama, pero CogC además **suma el nivel de anidamiento por cada estructura adentro**. 4 niveles anidados × varias ramas adentro = explosión de CogC.

3. **"Por qué la cobertura está en 64% y no en 100%? Coincide con la función más compleja?"** → Sí. Los tests cubren las ramas fáciles (validar_pedido al 100%, estado_pedido 3 de 9 ramas, calcular_envio 3 de 8+ ramas). La función más compleja es también la peor probada. Patrón típico: lo difícil de leer es también lo difícil de probar — y por eso la gente lo deja para "después".

4. **"Si fueras la revisora senior del Contract C que les entregó V1 (mañana), qué pedirías refactorizar primero?"** → `calcular_envio`. Tres señales convergen: CC banda C, CogC sobre umbral, cobertura bajo umbral. **Esa convergencia es lo que justifica la decisión.**

### Mensaje pedagógico de cierre

> **Mensaje 1:** "Las tres herramientas miden cosas distintas pero **convergen** cuando hay un problema real. `calcular_envio` no es 'subjetivamente fea' — es objetivamente cara de leer (CogC=40), objetivamente compleja (CC=12 banda C) y objetivamente mal probada (las ramas no cubiertas están adentro). Tres herramientas, una sola conclusión. Eso es lo que vuelve la decisión defendible ante un cliente o un auditor."

> **Mensaje 2:** "Y fíjense lo que pasó cuando predijeron a ojo: casi todas predijeron `estado_pedido` como la peor por los 8 `elif`. Pero CogC dijo que esa función era ordenada (CogC=9, plana). La intuición humana sin medidor falla. El medidor existe precisamente para eso. Mañana cuando V1 les entregue `autenticacion.py`, no van a auditar a ojo — van a medir."

---

## 5. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Puntos | Detalle |
|---|---|---|
| **Predicciones a ojo registradas** | 10 | Acción 1 completa antes de medir. Si miden y luego "predicen": −5. |
| **pytest interpretado correctamente** | 20 | 10 tests pasan, cobertura 64%, ramas Missing identificadas. Sin `--cov-branch`: −7. |
| **Tabla CC + CogC + MI completa y correcta** | 25 | Los 3 valores por función, 1 MI a nivel archivo, bandas correctas. Confunden CC con CogC: −10. |
| **Diferencia predicción vs realidad** | 15 | Una frase honesta explicando en qué se equivocaron. "Acerté en todo": −10 (poco probable). |
| **Plan de refactor justificado con datos** | 20 | Cada decisión apoyada en números. "Se ve mal" sin números: −12. Refactor de `validar_pedido` sin razón: −5. |
| **3 tests faltantes propuestos** | 10 | Que sean ramas reales del Missing, no inventadas. |

**Escalas:**
- **≥ 90:** excelente — la pareja está lista para auditar el Contract C de V1 con criterio.
- **70-89:** aprobado — entendieron las herramientas pero les falta integración.
- **50-69:** reprobado — usaron las herramientas mecánicamente sin interpretar.
- **< 50:** no comprendieron qué mide cada herramienta — repaso individual antes de los agentes.

---

## 6. Comandos exactos para el docente (paso a paso)

```bash
# Setup (una vez)
cd modulo3_code_generator/examples/practica_cierre/
pip install pytest pytest-cov radon complexipy

# Tests + cobertura
pytest -v
pytest --cov=gestor_pedidos --cov-branch --cov-report=term-missing

# Métricas estáticas
radon cc -s gestor_pedidos.py
radon mi -s gestor_pedidos.py
complexipy gestor_pedidos.py

# Si quiere ver la salida JSON de complexipy para enseñar el modo programático
complexipy --output-format json gestor_pedidos.py
cat complexipy-results.json
```

**Salida esperada de `pytest -v` (10 tests, todos pasan):**
```
test_validar_pedido_ok                  PASSED
test_validar_pedido_no_es_dict          PASSED
test_validar_pedido_sin_items           PASSED
test_validar_pedido_sin_cliente         PASSED
test_estado_pedido_pendiente            PASSED
test_estado_pedido_entregado            PASSED
test_estado_pedido_desconocido          PASSED
test_calcular_envio_nacional_no_urgente PASSED
test_calcular_envio_internacional_urgente PASSED
test_calcular_envio_premium_descuento   PASSED
```

---

## 7. Conexión con la clase de mañana

- **V1 mañana:** Las parejas van a generar `autenticacion.py` con V1. Cuando lo midan **con las mismas herramientas** que hoy, van a entender el "vacío" de V1 (genera código pero no lo mide).
- **V2 mañana:** Hace **automáticamente** lo que hoy hicieron a mano: corre radon, complexipy, bandit, consolida en el Quality Report del Contract C.
- **V3 mañana:** Hace lo de coverage automáticamente y añade la matriz de trazabilidad — el `Missing` que vieron hoy es lo que V3 reporta estructurado en el Contract C.

La idea es que **lleguen a V2 sintiendo que ya saben qué hace**, y la única novedad sea que ahora lo orquesta un agente.

---

*Documento vivo: actualizar después de aplicar con observaciones reales del aula.*
