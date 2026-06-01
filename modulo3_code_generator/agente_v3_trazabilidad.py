"""Agente v3 (M3): Code Generator + Trazabilidad CMMI L3 + Coverage.

Tercera version del agente del Modulo 3. Reusa TODO lo de v1 (generacion) y
v2 (analisis estatico), e incorpora el concepto NUEVO de v3: el agente
construye la matriz de trazabilidad bidireccional Contract B -> Contract C
y mide la cobertura del codigo generado.

Concepto nuevo de v3 (Temas 3 y 4 de la teoria):
    - Trazabilidad CMMI L3: cada escenario del Contract B debe tener al menos
      un test (markers @pytest.mark.scenario). Cero huerfanos en ambas direcciones.
    - Matriz bidireccional con % cobertura de requisitos y % tests justificados.
    - Coverage de codigo: branch coverage con pytest-cov (el estandar real).

Lo que sigue pendiente (lo resuelve v4):
    - Sin HITL del desarrollador senior — el output va directo al disco

==============================================================
ESQUELETO PARA LA PRACTICA V3 — las estudiantes completan los bloques # TODO
siguiendo el handout practica_v3_m3_estudiantes.md
==============================================================

Ejecutar:
    python agente_v3_trazabilidad.py
"""

import json
import re
import subprocess
import sys
import tempfile
import uuid
import warnings
from datetime import datetime
from pathlib import Path

warnings.filterwarnings("ignore")

from groq import Groq

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Reusar generacion (V1) y analisis estatico (V2)
from modulo3_code_generator.agente_v1_base import (
    GROQ_API_KEY,
    buscar_patrones_similares,
    cargar_contract_b,
    construir_prompt,
    generar_con_groq,
    inicializar_kb,
    parsear_respuesta,
)
from modulo3_code_generator.agente_v2_analisis_estatico import (
    clasificar_iso_25010,
    construir_function_metrics,
    construir_quality_report,
    ejecutar_bandit,
    ejecutar_complexipy,
    ejecutar_radon,
    volcar_codigo_a_disco,
)
from qualityai_modulo2.src.contract_b import GherkinTestSuite
from modulo3_code_generator.src.contract_c import (
    CodeGenerationResult,
    CoverageReport,
    GeneratedCodeModule,
    GeneratedTest,
    ScenarioTraceability,
    TestTraceability,
    TraceabilityMatrix,
    TraceabilityStatus,
)


# ============================================================
# PASO A: Extraer todos los scenario IDs del Contract B  [GIVEN]
# ============================================================
def extraer_scenario_ids(contract_b: GherkinTestSuite) -> dict[str, str]:
    """Recolecta todos los escenarios del Contract B.

    NOTA sobre los IDs: el Contract B de M2 no tiene un campo 'id' explicito
    por escenario, pero si tiene acceptance_criterion_id. En M3 usamos el
    acceptance_criterion_id como identificador del escenario para la matriz
    de trazabilidad (es la cadena AC -> escenario -> test).

    Devuelve: dict { scenario_id: nombre_descriptivo }
    """
    scenarios = {}
    for feature in contract_b.features:
        for sc in feature.scenarios:
            scenarios[sc.acceptance_criterion_id] = sc.name
    return scenarios


# ============================================================
# PASO B: Extraer los markers de los tests generados
# ============================================================
def extraer_markers_de_tests(tests: list[GeneratedTest]) -> dict[str, list[str]]:
    """Extrae, por cada test, la lista de scenario IDs que referencia.

    # TODO (Practica V3, Accion 1):
    #   Hay DOS fuentes de markers y debes cruzarlas:
    #   1. El campo test.scenario_ids (lo que el LLM declaro al generar).
    #   2. Los markers reales en test.source_code: lineas tipo
    #      @pytest.mark.scenario("SCN-001"). Usa una regex para extraerlos.
    #      Pista: re.findall(r'@pytest\\.mark\\.scenario\\(["\\\']([^"\\\']+)["\\\']\\)', codigo)
    #
    #   Cruza ambas: si el LLM declaro scenario_ids pero no los puso como
    #   markers en el codigo, ese test NO es trazable de verdad. La fuente
    #   de verdad es el marker en el codigo.
    #
    # Devuelve: dict { test_name: [scenario_id, ...] }
    """
    # TODO: implementar la extraccion de markers
    raise NotImplementedError("Completar extraer_markers_de_tests en la Practica V3")


# ============================================================
# PASO C: Construir la matriz de trazabilidad bidireccional
# ============================================================
def construir_matriz_trazabilidad(
    scenarios: dict[str, str],
    test_markers: dict[str, list[str]],
) -> TraceabilityMatrix:
    """Construye la matriz bidireccional Contract B -> Contract C.

    # TODO (Practica V3, Accion 2):
    #   Recuerda la regla maestra del Tema 3: solo los HUERFANOS violan.
    #   Many-to-many es valido.
    #
    #   LADO FORWARD (escenarios -> tests):
    #   1. Por cada scenario_id, buscar que tests lo referencian en test_markers.
    #   2. status = COVERED si tiene >= 1 test; ORPHAN_FORWARD si tiene 0.
    #   3. Construir un ScenarioTraceability por escenario.
    #
    #   LADO BACKWARD (tests -> escenarios):
    #   4. Por cada test, mirar sus scenario_ids.
    #   5. status = COVERED si tiene >= 1 escenario; ORPHAN_BACKWARD si tiene 0.
    #   6. Construir un TestTraceability por test.
    #
    #   METRICAS:
    #   7. requirements_coverage_pct = escenarios COVERED / total escenarios * 100
    #   8. tests_justified_pct = tests COVERED / total tests * 100
    #   9. orphan_scenarios = lista de scenario_ids huerfanos forward
    #  10. orphan_tests = lista de test_names huerfanos backward
    #  11. cmmi_l3_compliant = (sin huerfanos forward) and (sin huerfanos backward)
    #
    # Devuelve: TraceabilityMatrix
    """
    # TODO: implementar la construccion de la matriz
    raise NotImplementedError("Completar construir_matriz_trazabilidad en la Practica V3")


# ============================================================
# PASO D: Medir branch coverage con pytest-cov
# ============================================================
def medir_coverage(code_dir: Path, tests: list[GeneratedTest]) -> CoverageReport:
    """Vuelca los tests junto al codigo y corre pytest-cov --cov-branch.

    # TODO (Practica V3, Accion 3):
    #   1. Escribir cada test (test.source_code) a un archivo test_*.py
    #      dentro de code_dir.
    #   2. Correr pytest con cobertura de ramas:
    #      pytest --cov=<code_dir> --cov-branch --cov-report=json
    #      con subprocess.run(...).
    #   3. Parsear coverage.json. La cobertura de ramas esta en
    #      data["totals"]["percent_covered"] (line) y se calcula branch
    #      a partir de covered_branches / num_branches.
    #   4. Construir el CoverageReport:
    #      - branch_coverage_pct, line_coverage_pct
    #      - meets_threshold = branch_coverage_pct >= 80
    #      - uncovered_modules = archivos por debajo del umbral
    #
    #   Recuerda del Tema 4: branch coverage es la metrica principal,
    #   line coverage es solo referencia.
    #
    # Devuelve: CoverageReport
    """
    # TODO: implementar la medicion de coverage
    raise NotImplementedError("Completar medir_coverage en la Practica V3")


# ============================================================
# PIPELINE COMPLETO V3  [GIVEN — orquesta lo que las estudiantes completan]
# ============================================================
def pipeline_v3(contract_b: GherkinTestSuite) -> CodeGenerationResult:
    """Ejecuta el pipeline completo de M3-V3: genera, analiza, traza y mide cobertura."""
    print("=" * 60)
    print("AGENTE M3-V3 — Code Generator + Trazabilidad CMMI L3 + Coverage")
    print("=" * 60)

    client = Groq(api_key=GROQ_API_KEY)
    modelo, collection = inicializar_kb()

    todos_modulos: list[GeneratedCodeModule] = []
    todos_tests: list[GeneratedTest] = []

    # FASE 1: generacion (V1)
    for feature in contract_b.features:
        print(f"\nFeature {feature.user_story_id}: {feature.name}")
        patrones = buscar_patrones_similares(modelo, collection, feature, top_k=3)
        system_prompt, user_message = construir_prompt(feature, patrones)
        raw_response = generar_con_groq(client, system_prompt, user_message)
        modulos, tests = parsear_respuesta(raw_response, feature)
        todos_modulos.extend(modulos)
        todos_tests.extend(tests)
        print(f"   Generado: {len(modulos)} modulo(s), {len(tests)} test(s)")

    # FASE 2: analisis estatico (V2)
    print(f"\nPASO V2: Analisis estatico")
    code_dir = volcar_codigo_a_disco(todos_modulos)
    radon_data = ejecutar_radon(code_dir)
    complexipy_data = ejecutar_complexipy(code_dir)
    security_findings = ejecutar_bandit(code_dir)
    function_metrics = construir_function_metrics(radon_data, complexipy_data)
    mi_values = [v["mi"] for v in radon_data.get("mi", {}).values()]
    maintainability_index = round(sum(mi_values) / len(mi_values), 2) if mi_values else None
    iso_coverage = clasificar_iso_25010(function_metrics, security_findings, maintainability_index)
    quality_report = construir_quality_report(
        function_metrics, maintainability_index, security_findings, iso_coverage
    )

    # FASE 3: trazabilidad + coverage (lo nuevo de V3)
    print(f"\nPASO V3: Trazabilidad CMMI L3 + Coverage")
    scenarios = extraer_scenario_ids(contract_b)
    test_markers = extraer_markers_de_tests(todos_tests)
    traceability_matrix = construir_matriz_trazabilidad(scenarios, test_markers)
    coverage_report = medir_coverage(code_dir, todos_tests)

    print(f"   Cobertura de requisitos: {traceability_matrix.requirements_coverage_pct:.1f}%")
    print(f"   Tests justificados: {traceability_matrix.tests_justified_pct:.1f}%")
    print(f"   Huerfanos forward: {traceability_matrix.orphan_scenarios}")
    print(f"   Huerfanos backward: {traceability_matrix.orphan_tests}")
    print(f"   CMMI L3 compliant: {traceability_matrix.cmmi_l3_compliant}")
    print(f"   Branch coverage: {coverage_report.branch_coverage_pct:.1f}%")

    resultado = CodeGenerationResult(
        pipeline_run_id=f"v3-{uuid.uuid4().hex[:8]}",
        agent_version="0.3.0-v3-trazabilidad",
        source_contract_b_id=contract_b.pipeline_run_id,
        generated_code=todos_modulos,
        generated_tests=todos_tests,
        quality_report=quality_report,
        traceability_matrix=traceability_matrix,
        coverage_report=coverage_report,
        total_modules=len(todos_modulos),
        total_tests=len(todos_tests),
        # review -> queda en PENDING_REVIEW (lo resuelve V4)
    )
    return resultado


def imprimir_limitaciones():
    """Limitaciones de V3 que motivan V4."""
    print(f"\n{'=' * 60}")
    print(f"LIMITACIONES DE V3 (oportunidad de mejora)")
    print(f"{'=' * 60}")
    print(f"   - Sin HITL del desarrollador senior — el Contract C va directo al disco")
    print(f"     Las metricas miden lo objetivo, pero no ven naming, design intent")
    print(f"     ni code smells subjetivos. Eso lo aporta el humano.")
    print(f"     Solucion: V4 (review_cli_dev.py) agrega la revision senior")
    print(f"     antes de aprobar el Contract C para el Modulo 4.")


if __name__ == "__main__":
    contract_b_path = input(
        "\nRuta al Contract B JSON (Enter para usar el ejemplo incluido en M3):\n> "
    ).strip()
    if not contract_b_path:
        contract_b_path = str(
            Path(__file__).parent / "examples" / "contract_b_login_ejemplo.json"
        )

    contract_b = cargar_contract_b(contract_b_path)
    resultado = pipeline_v3(contract_b)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"contract_c_v3_{timestamp}.json"
    output_path.write_text(resultado.model_dump_json(indent=2), encoding="utf-8")
    print(f"\nContract C guardado en: {output_path}")

    imprimir_limitaciones()
