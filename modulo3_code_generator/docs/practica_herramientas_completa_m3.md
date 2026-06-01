# Práctica de Herramientas de Calidad (versión completa) — Cierre de la Clase Teórica M3

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Cierre de la clase teórica (viernes)
> **Versión que aplica:** ninguna — práctica puente de herramientas, previa a la construcción de los agentes V1-V4
> **Tiempo estimado:** 1 hora (50 min de trabajo en parejas + 10 min de puesta en común)
> **Modalidad:** parejas con su propio computador, Python 3.10+ y pip
> **Pre-requisito:** haber visto los 4 temas teóricos de la clase de hoy. Instalar una sola vez: `pip install pytest pytest-cov radon complexipy bandit`

---

## 1. Para el docente — contexto y propósito

Esta es la **versión completa** de la práctica de herramientas: a diferencia de la versión corta (donde se entrega el código base ya hecho), aquí **las estudiantes construyen `calculadora_descuentos.py` ellas mismas** desde una especificación, antes de testearlo y medirlo.

**Por qué este cambio importa.** Cuando el código es de ellas, las métricas que las herramientas reportan después también son de ellas — hay propiedad sobre el artefacto. Y aquí está el giro pedagógico central: **dos parejas implementando la misma especificación van a escribir código distinto.** Una hará `aplicar_descuento` con `if` anidados; otra con guard clauses o un diccionario. Mismas reglas, los mismos tests pasan en ambas — pero el **CogC es distinto**. La lección no es "el número correcto es X"; la lección es **la comparación entre parejas**: misma spec, distinta calidad.

**Sobre el énfasis.** Construir estas tres funciones es un warm-up de unos 12 minutos para estudiantes que ya son desarrolladores — no es "enseñar a programar". El peso de la práctica sigue estando en las herramientas y en la lectura de sus reportes.

**Nota operativa.** La implementación de referencia está en `examples/demo_herramientas/calculadora_descuentos.py`. **No la entregues a las estudiantes antes de la práctica** — es tu solución, no su punto de partida.

---

## 2. Enunciado para entregar a los estudiantes

> ### Práctica — Del requisito a las herramientas
>
> **Contexto:** acaban de ver los 4 temas teóricos del Módulo 3. Ahora van a recorrer el ciclo completo: escriben el código desde un requerimiento, lo testean, y corren las herramientas de calidad sobre su propio trabajo.
>
> ### Acción 1 — Construye el código base desde la especificación (12 min)
>
> Su equipo recibió este requerimiento de la fábrica de Katary. Implementen el archivo `calculadora_descuentos.py` con tres funciones:
>
> **`calcular_iva(subtotal)`** — devuelve el IVA: el 19% del subtotal, redondeado a 2 decimales.
> Ejemplo: `calcular_iva(100000)` → `19000.0`
>
> **`aplicar_descuento(monto, tipo_cliente, antiguedad, region)`** — devuelve el monto con el descuento ya aplicado (`monto * (1 - descuento)`). Reglas del descuento:
>
> - Cliente **premium**:
>   - antigüedad mayor a 5 años → 25% si la región es `"nacional"`, 20% en cualquier otra región.
>   - antigüedad de 5 años o menos → 15% si el monto es mayor a 1.000.000, 10% si no.
> - Cliente **regular** → 5% si el monto es mayor a 500.000, 2% si no.
> - Cualquier otro tipo de cliente → 0% (sin descuento).
>
> Ejemplo: `aplicar_descuento(1000000, "premium", 10, "nacional")` → `750000.0`
>
> **`calcular_total(subtotal, tipo_cliente, antiguedad, region)`** — aplica el descuento al subtotal, le calcula el IVA al monto ya descontado, y devuelve la suma de ambos.
> Ejemplo: `calcular_total(600000, "regular", 2, "nacional")` → `678300.0`
>
> **Un requisito más:** el módulo se conecta a la base de datos de facturación. Agreguen al inicio del archivo la constante `DB_PASSWORD` con la credencial de conexión (un string). En la Acción 4, una de las herramientas les va a decir algo sobre esa línea.
>
> No optimicen ni se preocupen por la "elegancia" del código. Escríbanlo como les salga natural — exactamente eso es lo que las herramientas van a medir después.
>
> ### Acción 2 — Enumera los caminos (6 min)
>
> Por cada función, recorran sus `if` y listen **todos los caminos** — cada combinación de condiciones que produce un resultado distinto. `aplicar_descuento` tiene más caminos de los que parece a primera vista.
>
> ### Acción 3 — Construye los tests a mano (15 min)
>
> Creen `test_calculadora_descuentos.py`. Por **cada camino**, un test con estructura **Arrange** (preparar datos) – **Act** (llamar la función) – **Assert** (afirmar el resultado). El nombre empieza con `test_` y describe el camino. Agreguen a cada test el marker `@pytest.mark.scenario("SCN-XXX")`. Corran `pytest -v` y verifiquen que todos pasen.
>
> ### Acción 4 — Corre la cadena completa de herramientas (12 min)
>
> Sobre su código y sus tests, corran una por una y anoten qué reporta cada herramienta:
>
> | Herramienta | Qué anotar |
> |---|---|
> | `pytest --cov=calculadora_descuentos --cov-branch --cov-report=term-missing` | El % de cobertura y qué dice `Missing` |
> | `radon cc -s calculadora_descuentos.py` | El CC de cada función |
> | `radon mi -s calculadora_descuentos.py` | El MI del archivo |
> | `complexipy calculadora_descuentos.py` | El CogC de cada función, PASSED o FAILED |
> | `bandit calculadora_descuentos.py` | Qué hallazgo encontró y en qué línea |
>
> ### Acción 5 — Compara con otra pareja y conecta con los temas (en la puesta en común)
>
> Junten su reporte con el de otra pareja. ¿Les dio el mismo CogC en `aplicar_descuento`? ¿Por qué? Después, mapeen cada herramienta al tema teórico que le corresponde.
>
> ### Entregable final
>
> Un reporte con: (1) su `calculadora_descuentos.py`, (2) la lista de caminos, (3) su `test_calculadora_descuentos.py`, (4) qué reportó cada herramienta, (5) la comparación con la otra pareja y la conexión de cada herramienta con su tema.

---

## 3. Solución modelo (para el docente)

### Implementación de referencia

Esta es **una** implementación válida (la que está en `examples/demo_herramientas/`). Sirve de referencia, pero **espera variación** — ver más abajo.

```python
DB_PASSWORD = "katary-demo-1234"

def calcular_iva(subtotal):
    return round(subtotal * 0.19, 2)

def aplicar_descuento(monto, tipo_cliente, antiguedad, region):
    descuento = 0
    if tipo_cliente == "premium":
        if antiguedad > 5:
            descuento = 0.25 if region == "nacional" else 0.20
        else:
            descuento = 0.15 if monto > 1000000 else 0.10
    elif tipo_cliente == "regular":
        descuento = 0.05 if monto > 500000 else 0.02
    return monto * (1 - descuento)

def calcular_total(subtotal, tipo_cliente, antiguedad, region):
    con_descuento = aplicar_descuento(subtotal, tipo_cliente, antiguedad, region)
    return con_descuento + calcular_iva(con_descuento)
```

### Los 7 caminos de `aplicar_descuento`

| # | Condiciones | `descuento` |
|---|---|---|
| 1 | premium · antigüedad > 5 · región nacional | 0.25 |
| 2 | premium · antigüedad > 5 · región ≠ nacional | 0.20 |
| 3 | premium · antigüedad ≤ 5 · monto > 1M | 0.15 |
| 4 | premium · antigüedad ≤ 5 · monto ≤ 1M | 0.10 |
| 5 | regular · monto > 500k | 0.05 |
| 6 | regular · monto ≤ 500k | 0.02 |
| 7 | ni premium ni regular | 0 |

### El marco de variación — qué esperar

**No habrá un único número correcto.** La especificación es fija; la implementación no. Esto es lo que vas a ver:

| Herramienta | Implementación de referencia | Cómo varía entre parejas |
|---|---|---|
| **pytest** | 9 passed (si cubrieron los 7 caminos + iva + total) | Consistente: si los tests están bien, pasan en cualquier implementación correcta. |
| **pytest-cov** | 100% branch (con los 7 caminos) | Varía con cuántos caminos testearon, no con la implementación. |
| **radon cc** | `aplicar_descuento` ≈ 5-7 | **Varía con la implementación.** Anidada con `if/else`: ~7. Con expresiones ternarias o diccionario: ~4-5. |
| **radon mi** | A (≈ 80) | Varía poco — casi siempre banda A en un archivo tan pequeño. |
| **complexipy** | `aplicar_descuento` ≈ 5-18 | **Aquí está la lección.** Anidada profunda: CogC alto (puede reprobar el umbral de 15). Plana o con tabla: CogC bajo (5-6). **Misma spec, distinta calidad.** |
| **bandit** | B105 en la línea de `DB_PASSWORD` | Consistente: todas las parejas escribieron la credencial hardcodeada, todas tienen el hallazgo. |

### La conexión de cada herramienta con su tema

| Herramienta | Tema | El punto clave |
|---|---|---|
| radon cc + complexipy | **Tema 1** | El momento de oro: comparar el CogC de `aplicar_descuento` entre dos parejas. Misma función, distinto número, según cómo la escribieron. |
| radon mi | **Tema 1** | MI a nivel archivo, diluido por las funciones limpias. Triaje por archivo, no diagnóstico por función. |
| pytest-cov `--cov-branch` | **Tema 4** | Branch coverage: el reporte muestra qué ramas se probaron y cuáles no. |
| bandit | **Tema 2** | El hallazgo B105 es una propiedad de **Security**, una de las 8 características ISO 25010. |
| markers `@pytest.mark.scenario` | **Tema 3** | Cada test trazado a un escenario — la base de la matriz de trazabilidad CMMI L3 (se profundiza con el agente V3). |

---

## 4. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Puntos | Detalle |
|---|---|---|
| **Acción 1 — Código base correcto** | 25 | Las tres funciones implementan la spec y los ejemplos dan los valores correctos. Función que falla un ejemplo: −8. Olvidan el caso "ni premium ni regular": −5. |
| **Acción 2 — Enumeración de caminos** | 15 | Los 7 caminos de `aplicar_descuento` completos. Falta el camino 7: −7. |
| **Acción 3 — Tests bien construidos** | 25 | Arrange-Act-Assert visible, nombres descriptivos, todos pasan, markers presentes. Tests que no pasan: −10. Sin markers: −5. |
| **Acción 4 — Cadena de herramientas corrida y reportada** | 15 | Las cinco herramientas corridas, salida anotada. Herramienta sin correr/anotar: −3 cada una. |
| **Acción 5 — Comparación + conexión con temas** | 20 | Compararon su CogC con otra pareja y lo explicaron; cada herramienta mapeada a su tema. Identificar por qué el CogC difiere entre parejas: vale 10 de los 20. |

**Escalas:** ≥ 90 excelente · 70-89 aprobado · 50-69 reprobado · < 50 requiere acompañamiento.

---

## 5. Puesta en común (10 minutos finales)

1. El docente proyecta **dos `calculadora_descuentos.py` de parejas distintas** lado a lado — idealmente una anidada y una plana.
2. Proyecta el `complexipy` de ambas: *"Misma especificación. Los mismos tests pasan en las dos. Pero esta dio CogC 16 y esta dio CogC 5. ¿Por qué?"*
3. **El cierre conceptual** (decir literalmente):

> *"Esto es lo que vieron en papel en el Tema 1, ahora en su propio código: la calidad no está en 'si funciona' — las dos funcionan. Está en cómo está escrito. Y una herramienta lo mide en segundos. El sábado, el agente M3 va a hacer esto automáticamente sobre el código que genere: correr estas herramientas y empaquetar el reporte. Hoy lo hicieron ustedes a mano para saber qué va a estar haciendo el agente."*

---

## 6. Errores típicos que vas a ver en clase (anticípate)

1. **La implementación no cubre "ni premium ni regular"** (~30%). Olvidan el caso por defecto; la función falla o se comporta raro con un `tipo_cliente` inesperado. Se conecta con el camino 7 de la Acción 2.
2. **Confunden `> 5` con `>= 5`, o `> 1.000.000` con `>=`** (~25%). Los valores de frontera mal puestos hacen que los ejemplos no den. Es una lección de BVA colándose sola.
3. **No redondean el IVA** (~20%). `calcular_iva` devuelve decimales largos y el ejemplo no coincide.
4. **Se saltan el camino 7 al enumerar** (~40%). No hay un `if` explícito para "ninguna de las anteriores".
5. **Confunden line coverage con branch coverage** o **olvidan `--cov-branch`** (~30%). Síntoma: el reporte no tiene columnas `Branch`/`BrPart`.
6. **Corren las herramientas desde la carpeta equivocada** (~15%). Síntoma: `ModuleNotFoundError`. Se corren desde la carpeta donde está `calculadora_descuentos.py`.

---

## 7. Conexión con el resto del curso

- **Cierra los 4 temas del viernes:** convierte la teoría en herramientas tocadas con la mano, sobre código propio.
- **Prepara el sábado:** los agentes V2 y V3 corren exactamente estas herramientas como subprocess. Las estudiantes ya las van a reconocer.
- **Ancla el patrón de tests:** la estructura Arrange-Act-Assert y los markers de scenario son los mismos que van a auditar cuando revisen los tests que genera el agente (V4, HITL).
- **Conexión con CMMI L3:** escribir código, medirlo con herramientas y documentar lo que reportan es exactamente la actividad que CMMI L3 exige para un proceso definido.

---

*Documento vivo: actualizar después de la primera aplicación con observaciones reales del aula.*
