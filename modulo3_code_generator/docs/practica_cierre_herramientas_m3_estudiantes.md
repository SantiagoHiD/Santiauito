# Práctica de cierre — Aplicar las herramientas a código ajeno

> **Curso:** Calidad de Software y Pruebas Automatizadas
> **Módulo:** 3 — Code Generator Agent
> **Sesión:** Cierre de temas teóricos antes de los agentes
> **Tiempo:** 40 minutos en parejas + 10 minutos de puesta en común
> **Modalidad:** parejas con su propio computador, `venv` activo y las herramientas instaladas

---

## Contexto

Ya vieron las cuatro herramientas teóricamente: pytest, radon, complexipy y el Maintainability Index. Anoche las corrieron sobre código que ustedes mismas escribieron. Hoy las van a aplicar a **código ajeno** — un módulo que les entregamos ya escrito, junto con un set de tests que está deliberadamente incompleto. Su trabajo es **diagnosticar** el módulo con las herramientas y proponer qué refactorizar.

¿Por qué código ajeno? Porque en su trabajo profesional rara vez van a medir su propio código en frío — van a medir el código que la IA generó, el código que un colega escribió, el código heredado de un proyecto anterior. Esta práctica las pone en ese modo: leer, medir, decidir.

**Prerrequisitos** (instalados en el venv del Módulo 3):

```bash
pip install pytest pytest-cov radon complexipy
```

Trabajen en `modulo3_code_generator/examples/practica_cierre/`. Allí van a encontrar tres archivos: `gestor_pedidos.py`, `test_gestor_pedidos.py` y `conftest.py`.

---

## Las 4 acciones que van a hacer

### Acción 1 — Lectura inicial sin herramientas (5 min)

Abran `gestor_pedidos.py` y léanlo. Tiene tres funciones: `validar_pedido`, `estado_pedido` y `calcular_envio`. **Sin correr nada todavía**, predigan **a ojo**:

- ¿Cuál de las tres funciones les parece más simple?
- ¿Cuál les parece más compleja de leer?
- ¿Cuál creen que va a tener el CC más alto?
- ¿Y el CogC más alto?

Anoten sus predicciones en su reporte. Después las van a contrastar con los números reales — y ahí va a estar la lección.

### Acción 2 — Correr pytest y leer su salida (10 min)

Posicionados en la carpeta `practica_cierre/`, corran:

```bash
pytest -v
```

**Respondan en su reporte:**

- ¿Cuántos tests hay en total? ¿Cuántos pasan? ¿Hay alguno que falle?
- Miren la sección de cobertura: ¿qué porcentaje da el módulo? ¿Está por encima o por debajo del umbral defendible del 80%?
- Lean la columna `Missing` del reporte de coverage. ¿Cuáles líneas no se están ejecutando? Abran el archivo `gestor_pedidos.py` y miren físicamente cuáles ramas quedan sin test.

Después corran con cobertura de ramas:

```bash
pytest --cov=gestor_pedidos --cov-branch --cov-report=term-missing
```

**Respondan:**

- ¿Qué nuevas líneas de "Missing" aparecen cuando activan `--cov-branch`?
- Esas son **ramas no cubiertas** (no líneas no ejecutadas). ¿Qué significa, para ustedes como ingenieras, que un `else` no se haya cubierto?

### Acción 3 — Correr radon y complexipy (15 min)

Sobre el mismo módulo, corran las tres mediciones:

```bash
radon cc -s gestor_pedidos.py
radon mi -s gestor_pedidos.py
complexipy gestor_pedidos.py
```

**Construyan esta tabla en su reporte** con los valores reales:

| Función | CC (radon) | banda CC | CogC (complexipy) | Diferencia CogC − CC |
|---|---|---|---|---|
| `validar_pedido` | | | | |
| `estado_pedido` | | | | |
| `calcular_envio` | | | | |

Y los valores a nivel archivo:

| Métrica | Valor | Banda / interpretación |
|---|---|---|
| Maintainability Index | | A / B / C |

**Respondan, leyendo la tabla:**

- ¿Cuál función supera el umbral defendible de CC < 10? ¿Y de CogC < 15?
- En cuál función la **diferencia CogC − CC** es más grande, y por qué creen que pasa eso? Miren el código fuente de esa función.
- ¿Coinciden los números con sus predicciones a ojo de la Acción 1? ¿En cuál se equivocaron más? Esa es la lección.

### Acción 4 — Decidir qué refactorizar (10 min)

Con las herramientas en la mano, ahora actúen como **revisoras seniors**: decidan qué se queda como está y qué se refactoriza. Llenen esta tabla:

| Función | Acción propuesta | Justificación con números |
|---|---|---|
| `validar_pedido` | ¿se queda? ¿se refactoriza? | |
| `estado_pedido` | | |
| `calcular_envio` | | |

Para cada acción, su justificación tiene que ser **defendible con datos**: "porque CC = X, CogC = Y, y supera/no supera el umbral".

**Adicionalmente, propongan:**

- ¿Qué tests faltan? Listen al menos 3 escenarios que pytest les muestra como rama no cubierta, y propongan el `test_...` que cerraría cada gap.

---

## Entregable final

Al cerrar los 40 minutos, cada pareja prepara un reporte breve con seis secciones:

| Sección | Contenido |
|---|---|
| **1. Predicciones a ojo** | Sus predicciones de la Acción 1 antes de medir |
| **2. Salida de pytest + cobertura** | Cuántos pasan, % cobertura, qué líneas/ramas quedan Missing |
| **3. Tabla CC + CogC + MI** | Los números reales con su banda |
| **4. Predicción vs realidad** | Una frase: en qué se equivocaron a ojo y por qué |
| **5. Plan de refactor** | Qué se queda y qué se refactoriza, justificado con números |
| **6. Tests faltantes** | 3 tests que ustedes agregarían para llegar a ≥ 80% branch coverage |

---

## Recordatorio crítico

Esta práctica las pone a medir código que **no escribieron ustedes** — es exactamente el escenario que van a vivir en las siguientes clases cuando el agente V1 genere `autenticacion.py` y ustedes tengan que decidir si confiar o no en ese código. La diferencia entre una operadora casual de IA y una ingeniera de calidad asistida por IA es:

1. **Medir antes de opinar.** No digan "este código se ve bien" — digan "este código tiene CC=12 banda C, CogC=40, MI=58, cobertura 64%".
2. **Diferenciar lo objetivo de lo subjetivo.** Las herramientas miden lo objetivo. Lo que es código bonito, bien diseñado y apropiado al negocio, eso lo deciden ustedes — pero después de mirar los números, no antes.
3. **Defender la decisión con datos.** Un refactor que se justifica solo con "se ve mal" no pasa una revisión de pares. Uno que se justifica con CC y CogC, sí.

¡A medir!
