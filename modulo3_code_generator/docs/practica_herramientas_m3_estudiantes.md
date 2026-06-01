# Práctica — Del código a las herramientas

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Cierre de la clase teórica
> **Tiempo:** 35 minutos en parejas + 10 minutos de puesta en común
> **Modalidad:** parejas con su propio computador, Python 3.10+ y pip

---

## Contexto

Acaban de ver los 4 temas teóricos del Módulo 3: métricas de calidad de código, ISO 25010, trazabilidad CMMI L3 y criterios de cobertura. Hasta ahora todo fue concepto y ejercicios de papel.

En esta práctica los van a ver **funcionando en herramientas reales**. Primero construyen los tests a mano, función por función. Después corren cinco herramientas sobre su propio trabajo y aprenden a leer lo que reporta cada una. Al final, cada herramienta se conecta con uno de los temas que vieron hoy.

El código base es `examples/demo_herramientas/calculadora_descuentos.py` — tres funciones: `calcular_iva`, `aplicar_descuento` y `calcular_total`.

**Instalen una sola vez:** `pip install pytest pytest-cov radon complexipy bandit`

---

## Las 4 acciones que van a hacer

### Acción 1 — Lee el código base y enumera los caminos

Abran `calculadora_descuentos.py`. Tiene tres funciones. Por cada una, recorran sus `if` y **listen todos los caminos** — cada combinación de condiciones que produce un resultado distinto.

`calcular_iva` y `calcular_total` tienen un solo caso cada una. `aplicar_descuento` tiene varios — esa es la interesante, y tiene más caminos de los que parece a primera vista. Escriban la lista completa en su reporte.

### Acción 2 — Construye el archivo de tests a mano

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

### Acción 3 — Corre la cadena completa de herramientas

Sobre su código y sus tests, corran **una por una** y anoten qué reporta cada herramienta:

| Herramienta | Qué anotar |
|---|---|
| `pytest-cov` | El % de cobertura y qué dice la columna `Missing` |
| `radon cc` | El CC de cada función — ¿cuál pasa el umbral de 10 y cuál no? |
| `radon mi` | El MI del archivo |
| `complexipy` | El CogC de cada función — ¿cuál sale PASSED y cuál FAILED? |
| `bandit` | Qué hallazgo encontró y en qué línea |

Los comandos exactos están al final de este documento.

### Acción 4 — Conecta cada herramienta con su tema

Para cada herramienta, digan **a qué tema teórico de la clase corresponde** lo que vieron:

- ¿Qué herramientas miden lo del Tema 1 (métricas de código)?
- ¿Cuál se conecta con el Tema 2 (ISO 25010)?
- ¿Cuál con el Tema 4 (cobertura)?
- ¿Y los markers que pusieron en los tests, con qué tema se conectan?

**Pista:** hay un momento clave en `aplicar_descuento` donde dos herramientas dan veredictos opuestos sobre la misma función. Encuéntrenlo y expliquen por qué.

---

## Entregable final

Al cerrar los 35 minutos, cada pareja prepara un reporte breve con:

| Sección | Contenido |
|---|---|
| **1. Caminos enumerados** | La lista completa de caminos de las tres funciones |
| **2. Archivo de tests** | El `test_calculadora_descuentos.py` que construyeron |
| **3. Reporte de herramientas** | Qué reportó cada una de las cinco herramientas |
| **4. Conexión con los temas** | Cada herramienta mapeada a su tema, y la explicación del momento de "veredictos opuestos" |

---

## Comandos útiles

**Instalar las herramientas (una sola vez):**
```bash
pip install pytest pytest-cov radon complexipy bandit
```

**Correr los tests:**
```bash
pytest -v
```

**Las cinco herramientas — córranlas desde la carpeta `demo_herramientas/`:**
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

Esta práctica las pone a tocar las herramientas con sus propias manos — no es una demo que miran, es trabajo que hacen. La calidad de su reporte depende de tres cosas:

1. Que la **enumeración de caminos sea completa** — `aplicar_descuento` tiene más caminos de los que se ven a primera vista.
2. Que los **tests estén bien construidos** — estructura Arrange-Act-Assert, nombres descriptivos, y que todos pasen.
3. Que la **conexión con los temas sea genuina** — no basta correr la herramienta, hay que entender qué concepto teórico está midiendo.

Si una herramienta dice "FAILED", lean con cuidado: puede estar diciendo "esta función reprueba un umbral", no "tu test falló". Son cosas distintas.

¡Manos a las herramientas!
