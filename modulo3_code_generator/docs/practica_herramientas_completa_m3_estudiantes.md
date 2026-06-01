# Práctica — Del requisito a las herramientas

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Cierre de la clase teórica
> **Tiempo:** 50 minutos en parejas + 10 minutos de puesta en común
> **Modalidad:** parejas con su propio computador, Python 3.10+ y pip

---

## Contexto

Acaban de ver los 4 temas teóricos del Módulo 3: métricas de calidad de código, ISO 25010, trazabilidad CMMI L3 y criterios de cobertura. Todo fue concepto y ejercicios de papel.

En esta práctica recorren el **ciclo completo sobre código propio**: escriben el código desde un requerimiento, lo testean a mano, y corren cinco herramientas de calidad sobre su propio trabajo. Al final comparan con otra pareja y conectan cada herramienta con su tema.

**Instalen una sola vez:** `pip install pytest pytest-cov radon complexipy bandit`

---

## Las 5 acciones que van a hacer

### Acción 1 — Construye el código base desde la especificación

Su equipo recibió este requerimiento de la fábrica de Katary. Implementen el archivo `calculadora_descuentos.py` con tres funciones:

**`calcular_iva(subtotal)`** — devuelve el IVA: el 19% del subtotal, redondeado a 2 decimales.
Ejemplo: `calcular_iva(100000)` → `19000.0`

**`aplicar_descuento(monto, tipo_cliente, antiguedad, region)`** — devuelve el monto con el descuento ya aplicado (`monto * (1 - descuento)`). Reglas del descuento:

- Cliente **premium**:
  - antigüedad mayor a 5 años → 25% si la región es `"nacional"`, 20% en cualquier otra región.
  - antigüedad de 5 años o menos → 15% si el monto es mayor a 1.000.000, 10% si no.
- Cliente **regular** → 5% si el monto es mayor a 500.000, 2% si no.
- Cualquier otro tipo de cliente → 0% (sin descuento).

Ejemplo: `aplicar_descuento(1000000, "premium", 10, "nacional")` → `750000.0`

**`calcular_total(subtotal, tipo_cliente, antiguedad, region)`** — aplica el descuento al subtotal, le calcula el IVA al monto ya descontado, y devuelve la suma de ambos.
Ejemplo: `calcular_total(600000, "regular", 2, "nacional")` → `678300.0`

**Un requisito más:** el módulo se conecta a la base de datos de facturación. Agreguen al inicio del archivo la constante `DB_PASSWORD` con la credencial de conexión (un string). En la Acción 4, una de las herramientas les va a decir algo sobre esa línea.

> **No optimicen ni se preocupen por la "elegancia" del código.** Escríbanlo como les salga natural — exactamente eso es lo que las herramientas van a medir después.

### Acción 2 — Enumera los caminos

Por cada función, recorran sus `if` y listen **todos los caminos** — cada combinación de condiciones que produce un resultado distinto. `calcular_iva` y `calcular_total` tienen un solo caso. `aplicar_descuento` tiene varios, y tiene más de los que parece a primera vista. Escriban la lista completa en su reporte.

### Acción 3 — Construye los tests a mano

Creen `test_calculadora_descuentos.py`. Por **cada camino** que enumeraron, escriban un test con esta estructura:

| Sección | Qué va |
|---|---|
| **Arrange** | Preparar los datos de entrada |
| **Act** | Llamar la función que se prueba |
| **Assert** | Afirmar que el resultado es el esperado |

Reglas:

- El nombre de la función **empieza con `test_`** (así lo encuentra pytest) y describe el camino. Ejemplo: `test_descuento_premium_antiguo_nacional`.
- Agreguen a cada test el marker `@pytest.mark.scenario("SCN-XXX")` — numérenlos SCN-001, SCN-002, etc.

Corran `pytest -v` y verifiquen que **todos pasen** antes de seguir.

### Acción 4 — Corre la cadena completa de herramientas

Sobre su código y sus tests, corran **una por una** y anoten qué reporta cada herramienta:

| Herramienta | Qué anotar |
|---|---|
| `pytest-cov` | El % de cobertura y qué dice la columna `Missing` |
| `radon cc` | El CC de cada función — ¿cuál pasa el umbral de 10 y cuál no? |
| `radon mi` | El MI del archivo |
| `complexipy` | El CogC de cada función — ¿cuál sale PASSED y cuál FAILED? |
| `bandit` | Qué hallazgo encontró y en qué línea |

Los comandos exactos están al final de este documento.

### Acción 5 — Compara con otra pareja y conecta con los temas

Junten su reporte con el de otra pareja:

- ¿Les dio el **mismo CogC** en `aplicar_descuento`? Si no, ¿por qué? Misma especificación, mismos tests pasan — ¿qué fue distinto?
- Mapeen cada herramienta al tema teórico que le corresponde: ¿cuál mide lo del Tema 1? ¿cuál se conecta con el Tema 2? ¿con el Tema 4? ¿y los markers de los tests?

---

## Entregable final

Al cerrar los 50 minutos, cada pareja prepara un reporte con:

| Sección | Contenido |
|---|---|
| **1. Código base** | Su `calculadora_descuentos.py` |
| **2. Caminos enumerados** | La lista completa de caminos de las tres funciones |
| **3. Archivo de tests** | Su `test_calculadora_descuentos.py` |
| **4. Reporte de herramientas** | Qué reportó cada una de las cinco herramientas |
| **5. Comparación + conexión** | La comparación con la otra pareja y cada herramienta mapeada a su tema |

---

## Comandos útiles

**Instalar las herramientas (una sola vez):**
```bash
pip install pytest pytest-cov radon complexipy bandit
```

**Registrar el marker `scenario`** — creen un archivo `pytest.ini` junto a sus archivos, con:
```ini
[pytest]
markers =
    scenario: vincula un test con un escenario del Contract B
```

**Correr los tests:**
```bash
pytest -v
```

**Las cinco herramientas — córranlas desde la carpeta donde está `calculadora_descuentos.py`:**
```bash
pytest --cov=calculadora_descuentos --cov-branch --cov-report=term-missing
radon cc -s calculadora_descuentos.py
radon mi -s calculadora_descuentos.py
complexipy calculadora_descuentos.py
bandit calculadora_descuentos.py
```

**Activar el venv si no está activo:**
```bash
# PowerShell (Windows)
.\venv\Scripts\Activate.ps1

# bash (Linux/Mac)
source venv/bin/activate
```

---

## Recordatorio

Esta práctica las pone a recorrer el ciclo completo: del requisito al código, del código a los tests, de los tests a las herramientas. La calidad de su reporte depende de tres cosas:

1. Que el **código implemente bien la especificación** — cuidado con los valores de frontera (`> 5` no es lo mismo que `>= 5`) y con el caso "ni premium ni regular".
2. Que la **enumeración de caminos sea completa** y los **tests estén bien construidos** — Arrange-Act-Assert, nombres descriptivos, todos pasan.
3. Que la **comparación con la otra pareja sea genuina** — el punto no es "quién lo hizo mejor", es entender *por qué* el mismo requisito produjo métricas distintas.

Si una herramienta dice "FAILED", lean con cuidado: puede estar diciendo "esta función reprueba un umbral", no "tu test falló". Son cosas distintas.

¡Manos al código y a las herramientas!
