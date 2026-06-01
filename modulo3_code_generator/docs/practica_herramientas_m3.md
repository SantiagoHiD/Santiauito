# Práctica de Herramientas de Calidad — Cierre de la Clase Teórica M3

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Cierre de la clase teórica (viernes)
> **Versión que aplica:** ninguna — es la práctica puente de herramientas, previa a la construcción de los agentes V1-V4
> **Tiempo estimado:** 45 minutos (35 min de trabajo en parejas + 10 min de puesta en común)
> **Modalidad:** parejas con su propio computador, Python 3.10+ y pip
> **Pre-requisito:** haber visto los 4 temas teóricos de la clase de hoy. Instalar una sola vez: `pip install pytest pytest-cov radon complexipy bandit`

---

## 1. Para el docente — contexto y propósito

Esta práctica cierra la clase teórica del viernes. Hasta este punto, los estudiantes vieron Complejidad Ciclomática, Cognitive Complexity, Maintainability Index, ISO 25010, trazabilidad y cobertura como **conceptos y ejercicios de papel**. Aquí, por primera vez, ven `radon`, `complexipy`, `bandit` y `pytest-cov` reportar esos mismos conceptos sobre código real.

El propósito pedagógico **no es** que aprendan a usar las herramientas como fin en sí mismo. Es que **reconozcan en la salida de cada herramienta el concepto teórico que le corresponde**. Cuando lleguen a los agentes el sábado, las herramientas no serán abstractas: las habrán corrido con sus propias manos sobre código que ellos mismos testearon.

**Triple objetivo:**

1. **Construcción activa.** Escriben el archivo de tests a mano, función por función, camino por camino — no reciben tests ya hechos.
2. **Lectura de herramientas.** Corren la cadena completa de cinco herramientas y aprenden a leer cada reporte.
3. **Conexión teoría-práctica.** Cada salida de herramienta se mapea explícitamente a uno de los 4 temas de la clase.

**Por qué este enfoque es superior a una demo del docente:** si los estudiantes solo ven las herramientas en una demostración pasiva, las olvidan. Si las corren ellos, sobre código que ellos testearon, el concepto se ancla. Esta práctica es la que convierte "vimos la teoría" en "tocamos la herramienta".

El código base es `examples/demo_herramientas/calculadora_descuentos.py` — tres funciones diseñadas a propósito: una limpia (`calcular_iva`), una enmarañada (`aplicar_descuento`) y un hallazgo de seguridad intencional (`DB_PASSWORD`).

---

## 2. Enunciado para entregar a los estudiantes

> ### Práctica — Del código a las herramientas
>
> **Contexto:** acaban de ver los 4 temas teóricos del Módulo 3. Ahora van a verlos funcionando en herramientas reales, sobre el código base `calculadora_descuentos.py`. Primero construyen los tests a mano; después corren la cadena de herramientas sobre su propio trabajo.
>
> ### Acción 1 — Lee el código base y enumera los caminos (8 min)
>
> Abran `examples/demo_herramientas/calculadora_descuentos.py`. Tiene tres funciones. Por cada una, recorran sus `if` y **listen todos los caminos** — cada combinación de condiciones que produce un resultado distinto.
>
> `calcular_iva` y `calcular_total` tienen un solo caso cada una. `aplicar_descuento` tiene varios — esa es la interesante. Escriban la lista completa de sus caminos en su reporte.
>
> ### Acción 2 — Construye el archivo de tests a mano (15 min)
>
> Creen `test_calculadora_descuentos.py`. Por **cada camino** que enumeraron, escriban un test con esta estructura:
>
> - **Arrange** — preparar los datos de entrada.
> - **Act** — llamar la función que se prueba.
> - **Assert** — afirmar que el resultado es el esperado.
>
> Reglas: el nombre de la función empieza con `test_` y describe el camino (ej: `test_descuento_premium_antiguo_nacional`). Agreguen a cada test el marker `@pytest.mark.scenario("SCN-XXX")`.
>
> Corran `pytest -v` y verifiquen que todos pasen.
>
> ### Acción 3 — Corre la cadena completa de herramientas (12 min)
>
> Sobre su código y sus tests, corran **una por una** y anoten qué reporta cada herramienta:
>
> | Herramienta | Comando | Qué anotar |
> |---|---|---|
> | pytest-cov | `pytest --cov=calculadora_descuentos --cov-branch --cov-report=term-missing` | El % de cobertura y qué dice `Missing` |
> | radon cc | `radon cc -s calculadora_descuentos.py` | El CC de cada función |
> | radon mi | `radon mi -s calculadora_descuentos.py` | El MI del archivo |
> | complexipy | `complexipy calculadora_descuentos.py` | El CogC de cada función y si PASSED/FAILED |
> | bandit | `bandit calculadora_descuentos.py` | Qué hallazgo encontró y en qué línea |
>
> ### Acción 4 — Conecta cada herramienta con su tema (en la puesta en común)
>
> Para cada herramienta, digan a qué tema teórico de la clase corresponde lo que vieron. Pista: hay un momento clave en `aplicar_descuento` donde dos herramientas dan veredictos opuestos.
>
> ### Entregable final
>
> Un reporte breve con: (1) la lista de caminos enumerados, (2) su archivo de tests, (3) qué reportó cada una de las cinco herramientas, (4) la conexión de cada herramienta con su tema.

---

## 3. Solución modelo (para el docente)

### Acción 1 — Los 7 caminos de `aplicar_descuento`

| # | Condiciones | `descuento` |
|---|---|---|
| 1 | premium · antigüedad > 5 · región nacional | 0.25 |
| 2 | premium · antigüedad > 5 · región ≠ nacional | 0.20 |
| 3 | premium · antigüedad ≤ 5 · monto > 1M | 0.15 |
| 4 | premium · antigüedad ≤ 5 · monto ≤ 1M | 0.10 |
| 5 | regular · monto > 500k | 0.05 |
| 6 | regular · monto ≤ 500k | 0.02 |
| 7 | ni premium ni regular | 0 (no entra a ningún `if`) |

El **camino 7 es el que más se escapa**: no tiene un `if` explícito, es el caso "ninguna de las anteriores". `calcular_iva` y `calcular_total` tienen un caso cada una.

### Acción 2 — Archivo de tests de referencia (9 tests)

```python
import pytest
from calculadora_descuentos import aplicar_descuento, calcular_iva, calcular_total

@pytest.mark.scenario("SCN-001")
def test_iva_basico():
    assert calcular_iva(100000) == 19000.0

@pytest.mark.scenario("SCN-002")
def test_descuento_premium_antiguo_nacional():
    assert aplicar_descuento(1000000, "premium", 10, "nacional") == 750000.0

@pytest.mark.scenario("SCN-003")
def test_descuento_premium_antiguo_internacional():
    assert aplicar_descuento(1000000, "premium", 10, "internacional") == 800000.0

@pytest.mark.scenario("SCN-004")
def test_descuento_premium_nuevo_monto_alto():
    assert aplicar_descuento(2000000, "premium", 3, "nacional") == 1700000.0

@pytest.mark.scenario("SCN-005")
def test_descuento_premium_nuevo_monto_bajo():
    assert aplicar_descuento(500000, "premium", 3, "nacional") == 450000.0

@pytest.mark.scenario("SCN-006")
def test_descuento_regular_monto_alto():
    assert aplicar_descuento(600000, "regular", 2, "nacional") == 570000.0

@pytest.mark.scenario("SCN-007")
def test_descuento_regular_monto_bajo():
    assert aplicar_descuento(400000, "regular", 2, "nacional") == 392000.0

@pytest.mark.scenario("SCN-008")
def test_descuento_cliente_sin_categoria():
    assert aplicar_descuento(1000000, "nuevo", 1, "nacional") == 1000000.0

@pytest.mark.scenario("SCN-009")
def test_total_integra_descuento_e_iva():
    assert calcular_total(600000, "regular", 2, "nacional") == 678300.0
```

### Acción 3 — Qué reporta cada herramienta (con los 9 tests)

| Herramienta | Salida esperada | Lectura |
|---|---|---|
| **pytest** | `9 passed` | El código funciona para los 9 caminos. |
| **pytest-cov** | `100% Cover`, `Missing` vacío | Con los 7 caminos cubiertos, branch coverage llega a 100%. Si una pareja cubrió menos caminos, `Missing` les dirá exactamente qué líneas y ramas faltan. |
| **radon cc** | `aplicar_descuento - B (7)`, `calcular_iva - A (1)`, `calcular_total - A (1)` | `aplicar_descuento` tiene CC = 7 — banda B, **pasa** el umbral de 10. |
| **radon mi** | `calculadora_descuentos.py - A (81.19)` | El archivo da 81.19, banda A. Pero es el **promedio**: las dos funciones limpias diluyen a la enmarañada. |
| **complexipy** | `aplicar_descuento 16 FAILED`, `calcular_iva 0 PASSED`, `calcular_total 0 PASSED` | `aplicar_descuento` tiene CogC = 16 — **reprueba** el umbral de 15. |
| **bandit** | `B105:hardcoded_password_string` en línea 16, severidad Low | Encontró la credencial hardcodeada `DB_PASSWORD`. |

### Acción 4 — La conexión de cada herramienta con su tema

| Herramienta | Tema | El punto clave |
|---|---|---|
| radon cc + complexipy | **Tema 1** | El momento de oro: `aplicar_descuento` da CC = 7 (pasa) pero CogC = 16 (reprueba). Es "CC pasa, CogC reprueba" demostrado con herramienta, no a mano. |
| radon mi | **Tema 1** | MI = 81.19 a nivel archivo, diluido por las funciones limpias. MI es triaje por archivo, no diagnóstico por función. |
| pytest-cov `--cov-branch` | **Tema 4** | Branch coverage: el reporte muestra exactamente qué ramas se probaron y cuáles no. |
| bandit | **Tema 2** | El hallazgo B105 es una propiedad de **Security**, una de las 8 características ISO 25010. |
| markers `@pytest.mark.scenario` | **Tema 3** | Cada test trazado a un escenario — la base de la matriz de trazabilidad CMMI L3 (se profundiza con el agente V3). |

---

## 4. Rúbrica de evaluación (sobre 100 puntos)

| Criterio | Puntos | Detalle |
|---|---|---|
| **Acción 1 — Enumeración de caminos** | 25 | Los 7 caminos de `aplicar_descuento` completos. Falta el camino 7 ("ni premium ni regular"): −10. Faltan otros caminos: −5 cada uno. |
| **Acción 2 — Tests bien construidos** | 35 | Estructura Arrange-Act-Assert visible, nombres descriptivos, todos pasan, markers presentes. Tests sin nombre descriptivo: −5. Tests que no pasan: −10. Sin markers: −5. |
| **Acción 3 — Cadena de herramientas corrida y reportada** | 20 | Las cinco herramientas corridas, salida anotada. Herramienta sin correr o sin anotar: −4 cada una. |
| **Acción 4 — Conexión herramienta ↔ tema** | 20 | Cada herramienta conectada con su tema correcto. Identificar el momento "CC pasa, CogC reprueba": vale 8 de los 20. |

**Escalas:** ≥ 90 excelente · 70-89 aprobado · 50-69 reprobado · < 50 requiere acompañamiento.

---

## 5. Puesta en común (10 minutos finales)

1. El docente proyecta el reporte de 2-3 parejas y compara la lista de caminos. Pregunta directa: *"¿quién encontró el camino 7? ¿quién se lo saltó?"*
2. Proyecta el reporte de `pytest-cov` de una pareja que cubrió menos caminos: *"miren lo que dice `Missing` — la herramienta les está diciendo qué no probaron."*
3. **El cierre conceptual** (decir literalmente):

> *"Fíjense en `aplicar_descuento`. Radon dijo CC = 7: pasa. Complexipy dijo CogC = 16: reprueba. Es la misma función. Esto que vieron en papel en el Tema 1 — que CC ciega al anidamiento — lo acaban de ver con dos herramientas dando veredictos opuestos sobre el mismo código. Eso es lo que el agente M3 va a hacer automáticamente: correr estas herramientas y empaquetar sus reportes en el Quality Report. El sábado ya no será abstracto."*

---

## 6. Errores típicos que vas a ver en clase (anticípate)

1. **Se saltan el camino 7** (~40%). Como no hay un `if` explícito para "ni premium ni regular", muchos no lo cuentan. Es el error más instructivo: aprovéchalo en la puesta en común.
2. **Confunden line coverage con branch coverage** al leer el reporte de pytest-cov (~30%). Recuérdales la diferencia del Tema 4.
3. **Olvidan el flag `--cov-branch`** (~25%) y reportan line coverage sin darse cuenta. Síntoma: el reporte no tiene columnas `Branch` ni `BrPart`.
4. **Se asustan con el "FAILED" de complexipy** (~20%). Creen que su test falló. Aclarar: complexipy dice "la función reprueba el umbral de CogC", no "tu test falló". Son cosas distintas.
5. **Corren las herramientas desde la carpeta equivocada** (~15%). Síntoma: `ModuleNotFoundError`. Las herramientas se corren desde `examples/demo_herramientas/`.
6. **Creen que el hallazgo de Bandit es culpa suya** (~10%). El `DB_PASSWORD` está en el código base a propósito. Aclarar que es material didáctico intencional.

---

## 7. Conexión con el resto del curso

- **Cierra los 4 temas del viernes:** esta práctica es el puente que convierte la teoría en herramientas tocadas con la mano. Cada estudiante sale del viernes habiendo corrido `radon`, `complexipy`, `bandit` y `pytest-cov`.
- **Prepara el sábado:** los agentes V2 y V3 corren exactamente estas herramientas como subprocess. Las estudiantes ya las van a reconocer — no parten de cero.
- **Ancla el patrón de tests:** la estructura Arrange-Act-Assert y los markers de scenario que practican aquí son los mismos que van a auditar cuando revisen los tests que genera el agente (V4, HITL).
- **Conexión con CMMI L3:** correr herramientas de medición y documentar lo que reportan es exactamente la actividad que CMMI L3 exige para un proceso definido. Las estudiantes están practicando una habilidad real de ingeniería de calidad.

---

*Documento vivo: actualizar después de la primera aplicación con observaciones reales del aula.*
