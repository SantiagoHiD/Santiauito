# Módulo 3 — Code Generator Agent (QualityAI)

Cuarto módulo de QualityAI. Pipeline de **4 agentes evolutivos** (V1 → V4) que toman escenarios de prueba en Gherkin (Contract B), generan código Python + tests, miden calidad estática, construyen matriz de trazabilidad CMMI L3 y cierran con revisión humana (HITL).

## Pipeline

```
Contract B (Gherkin) ──→ V1 ──→ Contract C v1   (código + tests, sin métricas)
                          │
                          └→ V2 ──→ Contract C v2   (+ quality_report ISO 25010)
                                    │
                                    └→ V3 ──→ Contract C v3   (+ trazabilidad + coverage)
                                              │
                                              └→ V4 ──→ Contract C v4   (+ review HITL)
                                                        │
                                                        ↓
                                                  Módulo 4 (Functional Tester)
```

| Versión | Concepto nuevo | Herramientas |
|---|---|---|
| **V1** | Generación con RAG sobre patrones Katary | Groq (LLM) + ChromaDB + sentence-transformers |
| **V2** | Análisis estático del código generado | radon, complexipy, bandit |
| **V3** | Trazabilidad CMMI L3 + branch coverage | regex de markers + pytest-cov |
| **V4** | Human-in-the-Loop (revisión senior) | CLI interactiva |

## Estructura del módulo

```
modulo3_code_generator/
├── agente_v1_base.py             ← esqueleto V1 (estudiantes completan TODOs)
├── agente_v1_solucion.py         ← versión completa (referencia docente)
├── agente_v2_analisis_estatico.py
├── agente_v2_solucion.py
├── agente_v3_trazabilidad.py
├── agente_v3_solucion.py
├── review_cli_dev.py             ← esqueleto V4 (HITL)
├── review_cli_dev_solucion.py
├── src/
│   └── contract_c.py             ← schema Pydantic de Contract C
├── examples/
│   ├── contract_b_login_ejemplo.json    ← input de V1
│   ├── knowledge_base/
│   │   └── katary_code_patterns.json    ← KB de patrones para RAG
│   ├── demo_herramientas/               ← módulo para practicar radon/complexipy/bandit
│   └── practica_cierre/                 ← módulo para la práctica de cierre
└── docs/
    ├── practica_v1_m3[_estudiantes].md
    ├── practica_v2_m3[_estudiantes].md
    ├── practica_v3_m3[_estudiantes].md
    ├── practica_v4_m3[_estudiantes].md
    ├── practica_herramientas_m3[_estudiantes].md       ← versión corta
    ├── practica_herramientas_completa_m3[_estudiantes].md ← versión completa
    ├── practica_cierre_herramientas_m3[_estudiantes].md   ← práctica de cierre
    └── practica_metricas.md             ← warm-up rápido (sin versión docente)
```

## Quick start

### 1. Setup

```bash
# Crear venv (recomendado: en la raíz del proyecto QualityAI, no acá adentro)
python -m venv venv

# Activar
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 2. Configurar credenciales

Copiá `.env.example` a `.env` y completá con tu Groq API Key:

```bash
cp .env.example .env
# editar .env y poner GROQ_API_KEY=gsk_...
```

Obtené tu key gratis en [console.groq.com/keys](https://console.groq.com/keys).

### 3. Correr V1 (esqueleto incompleto — para la práctica)

```bash
python agente_v1_base.py
```

Va a fallar con `NotImplementedError` en el primer TODO. Eso es esperado — las estudiantes completan los 3 bloques `# TODO` siguiendo `docs/practica_v1_m3_estudiantes.md`.

### 4. Correr la versión solución (referencia docente)

```bash
python agente_v1_solucion.py
```

Esa versión está completa. Cuando pida la ruta del Contract B, Enter para usar el ejemplo de login.

Lo mismo aplica a V2 y V3 (`agente_v*_solucion.py`). Para V4 es `review_cli_dev_solucion.py`.

### 5. Cadena completa

```bash
python agente_v1_solucion.py  # genera output/contract_c_v1_*.json
python agente_v2_solucion.py  # genera output/contract_c_v2_*.json
python agente_v3_solucion.py  # genera output/contract_c_v3_*.json
python review_cli_dev_solucion.py  # revisa el Contract C v3
```

## Prácticas (docs/)

Cada práctica tiene **dos versiones**:
- `practica_<nombre>_estudiantes.md` — enunciado para los estudiantes
- `practica_<nombre>.md` — versión docente con paso a paso, errores típicos anticipados y rúbrica

Las prácticas siguen el orden del módulo:
1. **Práctica de métricas** — warm-up: aplicar las herramientas a código propio (`practica_metricas.md`)
2. **Práctica de herramientas** — versión completa donde las parejas construyen + miden + comparan (`practica_herramientas_completa_*`)
3. **Práctica V1, V2, V3, V4** — una por agente
4. **Práctica de cierre** — aplicar las herramientas a código ajeno (`practica_cierre_herramientas_*`)

## Conceptos clave del módulo

- **CC (Cyclomatic Complexity)** — radon, umbral defendible CC < 10
- **CogC (Cognitive Complexity)** — complexipy, umbral defendible CogC < 15
- **MI (Maintainability Index)** — radon mi, umbral defendible MI >= 20
- **ISO 25010** — 8 características de calidad; V2 declara honestamente MEASURED / REQUIRES_HUMAN_JUDGMENT / NOT_APPLICABLE
- **CMMI L3 trazabilidad** — matriz bidireccional Contract B → Contract C, cero huérfanos
- **Branch coverage** — pytest-cov, umbral defendible >= 80%
- **HITL (Human-in-the-Loop)** — lo que las métricas no ven: naming, design intent, code smells subjetivos

## Versiones solución vs esqueletos

Los archivos `agente_*_solucion.py` y `review_cli_dev_solucion.py` son **referencia para el docente**. Tienen los TODOs completos y sirven para:
- Mostrar en clase si una pareja se atasca
- Correr el pipeline end-to-end sin depender de TODOs incompletos
- Verificar que el setup está bien

Los esqueletos (`agente_*_base.py`, `agente_v2_analisis_estatico.py`, `agente_v3_trazabilidad.py`, `review_cli_dev.py`) son los que las **estudiantes deben completar** en las prácticas.
