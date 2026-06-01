# Práctica warm-up — Diseña, mide y compara

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Warm-up antes de los agentes V1-V4
> **Tiempo:** 25 minutos en parejas + 5 minutos de puesta en común
> **Modalidad:** parejas con su propio computador, `venv` activo, con `pytest`, `radon`, `complexipy` y `bandit` instalados

---

## Contexto

Acaban de ver las herramientas que el agente M3-V2 va a correr automáticamente sobre el código que él genera. Pero **antes de delegárselo al agente**, ustedes lo van a hacer a mano sobre un módulo que ustedes mismas implementen. Misma especificación, parejas distintas, métricas distintas — esa variabilidad es la lección.

---

## La especificación

Implementen el archivo `tarifa_gimnasio.py` con **dos funciones** y **una constante**.

### Constante (va al inicio del archivo)

```python
API_KEY_PASARELA = "demo-api-key-no-usar-en-prod-12345"  # credencial demo de la pasarela de pago
```

(Si una herramienta les dice algo sobre esta línea más tarde, anótenlo.)

### Función 1 — `calcular_mensualidad(plan, edad, codigo_descuento)`

Calcula cuánto paga un socio según su plan y descuento aplicable.

**Precios base:**

| Plan | Precio |
|---|---|
| `"basico"` | 50000 |
| `"estandar"` | 85000 |
| `"premium"` | 120000 |

**Descuentos disponibles (NO se acumulan — aplica el MAYOR):**

- Si `edad >= 60` → 15%
- Si `edad < 18` → 25%
- Si `codigo_descuento == "NUEVO2026"` → 20%
- Si `codigo_descuento == "AMIGO"` → 10%
- Cualquier otra cosa → 0%

**Devuelve** el valor a pagar (`precio_base * (1 - descuento)`).

**Ejemplos de validación:**

| Llamada | Resultado esperado |
|---|---|
| `calcular_mensualidad("estandar", 30, "NUEVO2026")` | `68000.0` |
| `calcular_mensualidad("premium", 65, "AMIGO")` | `102000.0` *(gana el 15% por edad)* |
| `calcular_mensualidad("basico", 16, None)` | `37500.0` *(25% por menor de edad)* |
| `calcular_mensualidad("basico", 30, None)` | `50000.0` |

### Función 2 — `validar_tarjeta(numero, codigo_seguridad, mes_exp, ano_exp)`

Devuelve `True` si todos estos pasan, `False` si alguno falla:

- `numero` es un string de exactamente **16 dígitos numéricos**
- `codigo_seguridad` es un string de exactamente **3 dígitos numéricos**
- `mes_exp` es un entero entre **1 y 12**
- `ano_exp` es un entero **>= 2026**

---

## Las 3 acciones

### Acción 1 — Implementar (10 min)

Codeen las dos funciones. **No optimicen.** Háganlo como les salga natural — exactamente eso es lo que las herramientas van a medir después.

### Acción 2 — Tests (10 min)

Creen `test_tarifa_gimnasio.py`. Por cada función, escriban **al menos 4 tests** que cubran:

- Camino feliz (lo esperado)
- Caso límite (edad = 60, 16 dígitos exactos, etc.)
- Caso inválido (qué pasa con basura)
- Caso especial (descuentos compitiendo, año pasado, etc.)

Corran `pytest -v` y verifiquen que **todos pasen**.

### Acción 3 — Medir (5 min)

Sobre **su** código:

```bash
radon cc -s tarifa_gimnasio.py
radon mi -s tarifa_gimnasio.py
complexipy tarifa_gimnasio.py
bandit tarifa_gimnasio.py
```

Anoten en su reporte:

- CC + banda de cada función
- MI del archivo
- CogC de cada función (y si alguna salió ❌ FAILED)
- Qué encontró bandit y en qué línea

---

## Entregable

Una tabla así, con su nombre de pareja arriba:

| Función | CC | banda | CogC | Status complexipy |
|---|---|---|---|---|
| `calcular_mensualidad` | | | | PASS / FAILED |
| `validar_tarjeta` | | | | PASS / FAILED |

Plus:

- **MI del archivo:** _______
- **Hallazgo de bandit:** _______ (test_id + línea + severity)

---

## Puesta en común (5 min)

Comparen su tabla con otra pareja:

- ¿Les dio el **mismo CC** en `calcular_mensualidad`? Si no, ¿por qué? Misma especificación, mismos descuentos no acumulables — **¿qué fue distinto en su implementación?**
- ¿Coincidieron en CogC, o una pareja escribió la lógica más anidada que la otra?
- ¿A las dos parejas les disparó bandit el mismo hallazgo? ¿En la misma línea?

Esa variabilidad — mismo requisito, parejas distintas, métricas distintas — es exactamente lo que el agente V2 va a normalizar más adelante.

---

## Comandos útiles

**Instalar las herramientas (una sola vez, con el `venv` activo):**

```bash
pip install pytest radon complexipy bandit
```

**Correr los tests:**

```bash
pytest -v
```

**Las cuatro mediciones, en una sola línea (Windows PowerShell):**

```powershell
radon cc -s tarifa_gimnasio.py ; radon mi -s tarifa_gimnasio.py ; complexipy tarifa_gimnasio.py ; bandit tarifa_gimnasio.py
```

---

## Recordatorio

La calidad del entregable depende de tres cosas:

1. Que el **código implemente la especificación** correctamente — cuidado con los descuentos compitiendo: el de mayor porcentaje gana, no se acumulan.
2. Que los **tests realmente verifiquen algo** — un `assert resultado is not None` no es un test, es un placebo.
3. Que la **comparación con la otra pareja sea genuina** — el punto no es "quién midió mejor", es entender *por qué* el mismo requisito produjo métricas distintas.

¡A medir!
