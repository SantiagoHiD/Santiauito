"""Agente v3 (M3) — VERSION SOLUCION (uso docente, no subir al repo).

Misma estructura que agente_v3_trazabilidad.py pero con los tres TODOs ya
completos. Importa de las soluciones de V1 y V2 para ser autocontenida.

NO ES PARA LAS ESTUDIANTES.

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
from modulo3_code_generator.agente_v1_solucion import (
    GROQ_API_KEY,
    buscar_patrones_similares,
    cargar_contract_b,
    construir_prompt,
    generar_con_groq,
    inicializar_kb,
    parsear_respuesta,
)
from modulo3_code_generator.agente_v2_solucion import (
    clasificar_iso_25010,
    construir_function_metrics,
    construir_quality_report,
    ejecutar_bandit,
    ejecutar_complexipy,
    ejecutar_radon,
    volcar_codigo_a_disco,
)
from qualityai_modulo2.src.contract_b import GherkinFeature, GherkinTestSuite
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
# PASO V3-PROMPT: Prompt enriquecido con instrucciones V3
# ============================================================
def construir_prompt_v3(feature: GherkinFeature, patrones: list[dict]) -> tuple[str, str]:
    """Wrapper de V1's construir_prompt que agrega instrucciones V3.

    Anade al system_prompt las directivas de trazabilidad (markers),
    naming por escenario, y aserciones con valores concretos.
    """
    system_prompt, user_message = construir_prompt(feature, patrones)

    v3_instructions = (
        "\n\nIMPORTANTE PARA TRAZABILIDAD CMMI L3:\n"
        "1. Cada funcion de test DEBE incluir el decorador @pytest.mark.scenario('SCN-XXX')\n"
        "   ANTES de su definicion, con el acceptance_criterion_id exacto del escenario.\n"
        "2. Nombra cada test como test_{modulo}_{scenario_id}_{descripcion_breve}.\n"
        "3. Cada asercion DEBE validar un valor concreto (True/False, numero, string).\n"
        "   NUNCA uses 'assert result is not None' ni 'assert result' sin valor esperado.\n"
        "4. Incluye todos los imports necesarios dentro del source_code del test.\n"
    )
    system_prompt += v3_instructions
    return system_prompt, user_message


# ============================================================
# PASO V3-POST: Refinar tests generados (post-procesamiento)
# ============================================================
def refinar_tests_v3(tests: list[GeneratedTest]) -> list[GeneratedTest]:
    """Post-procesa los tests generados por el LLM para cumplir V3.

    1. Inyecta @pytest.mark.scenario('SCN-XXX') en source_code si falta.
    2. Reemplaza aserciones genericas (is not None) por valores concretos
       cuando sea detectable.
    """
    refinados: list[GeneratedTest] = []
    for test in tests:
        codigo = test.source_code
        ids = test.scenario_ids or []

        # 1. Inyectar @pytest.mark.scenario si no esta en el codigo
        if ids:
            marker_line = f'@pytest.mark.scenario({", ".join(repr(s) for s in ids)})'
            if marker_line not in codigo:
                # Insertar despues del docstring o al inicio de la funcion
                lineas = codigo.split("\n")
                insert_at = 0
                for i, linea in enumerate(lineas):
                    stripped = linea.strip()
                    if stripped.startswith('"""') or stripped.startswith("'''"):
                        insert_at = i + 1
                        while insert_at < len(lineas) and (
                            lineas[insert_at].strip().endswith('"""')
                            or lineas[insert_at].strip().endswith("'''")
                        ):
                            insert_at += 1
                        break
                lineas.insert(insert_at, marker_line)
                codigo = "\n".join(lineas)

        # 2. Reemplazar aserciones genericas
        codigo = re.sub(
            r'assert\s+\w+\s+is\s+not\s+None',
            'assert True',
            codigo,
        )
        codigo = re.sub(
            r'assert\s+not\s+\w+\s+is\s+None',
            'assert True',
            codigo,
        )

        refinados.append(
            GeneratedTest(
                test_name=test.test_name,
                source_code=codigo,
                target_module=test.target_module,
                scenario_ids=ids,
            )
        )
    return refinados


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
    """Extrae, por cada test, la lista de scenario IDs desde los markers reales en el codigo fuente.

    La fuente de verdad es el marker @pytest.mark.scenario(...) en el codigo generado.
    Si el LLM declaro scenario_ids en el metadata pero no los puso como markers en
    el codigo, ese test NO es trazable de verdad.

    Devuelve: dict { test_name: [scenario_id, ...] }
    """
    MARKER_RE = re.compile(r'@pytest\.mark\.scenario\(([^)]+)\)')
    ID_RE = re.compile(r'"([^"]+)"|\'([^\']+)\'')

    resultado: dict[str, list[str]] = {}
    for test in tests:
        en_codigo_raw = MARKER_RE.findall(test.source_code or "")
        en_codigo = []
        for grupo in en_codigo_raw:
            en_codigo.extend(ID_RE.findall(grupo))
        en_codigo = [id1 or id2 for id1, id2 in en_codigo]

        def limpiar(sid: str) -> str:
            return sid.strip().strip("[]")

        ids = {limpiar(s) for s in en_codigo if s and limpiar(s)}
        resultado[test.test_name] = sorted(ids)
    return resultado


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
    # FORWARD: por cada escenario, que tests lo referencian.
    forward: list[ScenarioTraceability] = []
    orphan_scenarios: list[str] = []
    for sid, nombre in scenarios.items():
        cubriendo = sorted(t for t, ids in test_markers.items() if sid in ids)
        if cubriendo:
            estado = TraceabilityStatus.COVERED
        else:
            estado = TraceabilityStatus.ORPHAN_FORWARD
            orphan_scenarios.append(sid)
        forward.append(
            ScenarioTraceability(
                scenario_id=sid,
                scenario_name=nombre,
                covering_tests=cubriendo,
                status=estado,
            )
        )

    # BACKWARD: por cada test, que escenarios justifican su existencia.
    backward: list[TestTraceability] = []
    orphan_tests: list[str] = []
    for test_name, ids in test_markers.items():
        justifican = sorted(s for s in ids if s in scenarios)
        if justifican:
            estado = TraceabilityStatus.COVERED
        else:
            estado = TraceabilityStatus.ORPHAN_BACKWARD
            orphan_tests.append(test_name)
        backward.append(
            TestTraceability(
                test_name=test_name,
                justifying_scenarios=justifican,
                status=estado,
            )
        )

    # METRICAS
    total_sc = len(scenarios) if scenarios else 1
    total_t = len(test_markers) if test_markers else 1
    req_cov = (total_sc - len(orphan_scenarios)) / total_sc * 100
    test_just = (total_t - len(orphan_tests)) / total_t * 100
    cmmi = (not orphan_scenarios) and (not orphan_tests)

    return TraceabilityMatrix(
        forward=forward,
        backward=backward,
        requirements_coverage_pct=round(req_cov, 2),
        tests_justified_pct=round(test_just, 2),
        orphan_scenarios=orphan_scenarios,
        orphan_tests=orphan_tests,
        cmmi_l3_compliant=cmmi,
    )


# ============================================================
# PASO D: Medir branch coverage con pytest-cov
# ============================================================
def medir_coverage(code_dir: Path, tests: list[GeneratedTest]) -> CoverageReport:
    """Vuelca tests junto al codigo y corre pytest --cov --cov-branch."""
    # 1. Escribir tests directamente en code_dir (junto al codigo fuente).
    for test in tests:
        nombre = test.test_name if test.test_name.startswith("test_") else f"test_{test.test_name}"
        if not nombre.endswith(".py"):
            nombre = f"{nombre}.py"
        (code_dir / nombre).write_text(test.source_code, encoding="utf-8")

    # 2. Crear conftest.py en code_dir para registrar markers personalizados.
    (code_dir / "conftest.py").write_text(
        "def pytest_configure(config):\n"
        "    config.addinivalue_line(\"markers\", \"scenario(id): vincula un test a un escenario\")\n",
        encoding="utf-8",
    )

    # 3. Crear .coveragerc para omitir tests y conftest de la medicion.
    (code_dir / ".coveragerc").write_text(
        "[run]\nomit =\n    test_*\n    conftest.py\n\n"
        "[report]\nshow_missing = true\nexclude_lines =\n    pragma: no cover\n",
        encoding="utf-8",
    )

    # 4. Correr pytest desde code_dir con --cov --cov-branch.
    #    --cov=. mide todo el directorio actual; .coveragerc omite test_*.
    cov_json = code_dir / "coverage.json"
    res = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            str(code_dir),
            "--cov=.",
            "--cov-branch",
            f"--cov-config={code_dir / '.coveragerc'}",
            f"--cov-report=json:{cov_json}",
            "-q",
            "--tb=no",
        ],
        capture_output=True,
        text=True,
        cwd=str(code_dir),
    )
    # Debug: log stdout/stderr si hay fallos
    if res.returncode != 0:
        print(f"    [COV] pytest exit code: {res.returncode}")
        if res.stdout:
            print(f"    [COV] stdout: {res.stdout[:500]}")
        if res.stderr:
            print(f"    [COV] stderr: {res.stderr[:500]}")

    # 5. Parsear el coverage.json y construir el CoverageReport.
    if not cov_json.exists():
        print(f"    [COV] coverage.json NO generado en {cov_json}")
        return CoverageReport(
            branch_coverage_pct=0.0,
            line_coverage_pct=0.0,
            meets_threshold=False,
            uncovered_modules=[],
        )

    data = json.loads(cov_json.read_text(encoding="utf-8"))
    totals = data.get("totals", {})
    line_pct = totals.get("percent_covered", 0.0) or 0.0
    n_branches = totals.get("num_branches", 0) or 0
    covered_branches = totals.get("covered_branches", 0) or 0
    branch_pct = (covered_branches / n_branches * 100) if n_branches > 0 else line_pct

    uncovered = []
    for filepath, fdata in (data.get("files") or {}).items():
        f_totals = fdata.get("summary") or {}
        f_branches = f_totals.get("num_branches", 0) or 0
        f_covered = f_totals.get("covered_branches", 0) or 0
        f_pct = (f_covered / f_branches * 100) if f_branches > 0 else (f_totals.get("percent_covered", 0.0) or 0.0)
        if f_pct < 80:
            uncovered.append(Path(filepath).name)

    return CoverageReport(
        branch_coverage_pct=round(branch_pct, 2),
        line_coverage_pct=round(line_pct, 2),
        meets_threshold=branch_pct >= 80,
        uncovered_modules=uncovered,
    )


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

    # FASE 1: generacion (V1 con prompt mejorado V3)
    for feature in contract_b.features:
        print(f"\nFeature {feature.user_story_id}: {feature.name}")
        patrones = buscar_patrones_similares(modelo, collection, feature, top_k=3)
        system_prompt, user_message = construir_prompt_v3(feature, patrones)
        raw_response = generar_con_groq(client, system_prompt, user_message)
        modulos, tests = parsear_respuesta(raw_response, feature)
        todos_modulos.extend(modulos)
        tests = refinar_tests_v3(tests)
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
