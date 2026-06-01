"""Agente v2 (M3): Code Generator + Analisis Estatico.

Segunda version del agente del Modulo 3. Reusa TODO lo que construiste en
v1 (RAG, prompt, generacion, parseo) e incorpora el concepto NUEVO de v2:
el agente corre herramientas de analisis estatico sobre el codigo que el
mismo genero, y produce el primer Quality Report estructurado por
caracteristica ISO 25010.

Concepto nuevo de v2 (Temas 1 y 2 de la teoria):
    - Metricas de calidad de codigo: CC (radon), CogC (complexipy), MI (radon)
    - Hallazgos de seguridad: Bandit
    - Quality Report con las 8 caracteristicas ISO 25010, declarando
      honestamente MEASURED / REQUIRES_HUMAN_JUDGMENT / NOT_APPLICABLE

Lo que sigue pendiente (lo resuelve v3 y v4):
    - Sin trazabilidad — no se verifica que cada escenario tenga test (v3)
    - Sin coverage — no se mide que tan probado esta el codigo (v3)
    - Sin HITL del desarrollador senior (v4)

==============================================================
ESQUELETO PARA LA PRACTICA V2 — las estudiantes completan los bloques # TODO
siguiendo el handout practica_v2_m3_estudiantes.md
==============================================================

Ejecutar:
    python agente_v2_analisis_estatico.py
"""

import json
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

# Reusar lo que las estudiantes ya construyeron en V1
from modulo3_code_generator.agente_v1_base import (
    GROQ_API_KEY,
    buscar_patrones_similares,
    cargar_contract_b,
    construir_prompt,
    generar_con_groq,
    inicializar_kb,
    parsear_respuesta,
)
from modulo2_test_architect.src.contract_b import GherkinTestSuite
from modulo3_code_generator.src.contract_c import (
    CodeGenerationResult,
    ComplexityBand,
    FunctionMetrics,
    GeneratedCodeModule,
    GeneratedTest,
    MeasurementStatus,
    QualityCharacteristic,
    QualityCharacteristicResult,
    QualityReport,
    SecurityFinding,
    SecuritySeverity,
)


# ============================================================
# PASO A: Volcar el codigo generado a archivos temporales  [GIVEN]
# ============================================================
def volcar_codigo_a_disco(modulos: list[GeneratedCodeModule]) -> Path:
    """Escribe el codigo generado a un directorio temporal.

    Las herramientas de analisis estatico (radon, complexipy, Bandit) operan
    sobre archivos en disco, no sobre strings. Por eso volcamos el codigo
    generado a un directorio temporal antes de medirlo.
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="m3_codigo_"))
    for modulo in modulos:
        (tmp_dir / modulo.filename).write_text(modulo.source_code, encoding="utf-8")
    print(f"   Codigo volcado a: {tmp_dir}")
    return tmp_dir


# ============================================================
# PASO B: Correr radon (CC + MI)
# ============================================================
def ejecutar_radon(code_dir: Path) -> dict:
    """Corre radon sobre el directorio de codigo y devuelve CC y MI.

    # TODO (Practica V2, Accion 1):
    #   1. Correr 'radon cc -j <code_dir>' con subprocess.run(..., capture_output=True).
    #      El flag -j devuelve JSON parseable.
    #   2. Correr 'radon mi -j <code_dir>' igual.
    #   3. Parsear ambas salidas JSON.
    #   4. Devolver un dict con la estructura:
    #      {
    #        "cc": { "archivo.py": [ {function, complexity, rank, ...}, ... ] },
    #        "mi": { "archivo.py": {"mi": float, "rank": "A"|"B"|"C"} }
    #      }
    #
    # Pista: subprocess.run(["python","-m","radon","cc","-j",str(code_dir)], ...)
    """
    # TODO: implementar la ejecucion de radon
    raise NotImplementedError("Completar ejecutar_radon en la Practica V2")


# ============================================================
# PASO C: Correr complexipy (Cognitive Complexity)
# ============================================================
def ejecutar_complexipy(code_dir: Path) -> dict:
    """Corre complexipy sobre el directorio de codigo y devuelve CogC por funcion.

    # TODO (Practica V2, Accion 2):
    #   1. Correr complexipy sobre code_dir con subprocess.run(...).
    #      Sugerencia: usar la salida en formato JSON si esta disponible,
    #      o parsear la salida de texto.
    #   2. Devolver un dict: { "archivo.py": { "nombre_funcion": cogc_int, ... } }
    #
    # Recuerda del Tema 1: el umbral defendible de CogC es < 15.
    """
    # TODO: implementar la ejecucion de complexipy
    raise NotImplementedError("Completar ejecutar_complexipy en la Practica V2")


# ============================================================
# PASO D: Correr Bandit (seguridad)
# ============================================================
def ejecutar_bandit(code_dir: Path) -> list[SecurityFinding]:
    """Corre Bandit sobre el directorio de codigo y devuelve los hallazgos.

    # TODO (Practica V2, Accion 3):
    #   1. Correr 'bandit -r -f json <code_dir>' con subprocess.run(...).
    #   2. Parsear la salida JSON. Los hallazgos vienen en data["results"].
    #   3. Por cada hallazgo construir un SecurityFinding con:
    #      test_id, severity (mapear a SecuritySeverity), module, line_number, description.
    #
    # Nota: Bandit retorna exit code != 0 cuando encuentra hallazgos — eso es
    # esperado, NO es un error de ejecucion.
    """
    # TODO: implementar la ejecucion de Bandit
    raise NotImplementedError("Completar ejecutar_bandit en la Practica V2")


# ============================================================
# PASO E: Consolidar metricas por funcion  [GIVEN parcialmente]
# ============================================================
def construir_function_metrics(radon_data: dict, complexipy_data: dict) -> list[FunctionMetrics]:
    """Cruza la salida de radon y complexipy en una lista de FunctionMetrics.

    # TODO (Practica V2, Accion 4):
    #   Por cada funcion que aparece en radon_data["cc"]:
    #   1. Tomar su cyclomatic_complexity y su banda (cc_band).
    #   2. Buscar su cognitive_complexity en complexipy_data.
    #   3. Calcular exceeds_threshold = (CC >= 10) or (CogC >= 15).
    #   4. Construir el FunctionMetrics.
    #
    # Devuelve: list[FunctionMetrics]
    """
    # TODO: implementar el cruce de metricas
    raise NotImplementedError("Completar construir_function_metrics en la Practica V2")


# ============================================================
# PASO F: Clasificar las 8 caracteristicas ISO 25010
# ============================================================
def clasificar_iso_25010(
    function_metrics: list[FunctionMetrics],
    security_findings: list[SecurityFinding],
    maintainability_index: float | None,
) -> list[QualityCharacteristicResult]:
    """Construye la fila de resultado para cada una de las 8 caracteristicas ISO 25010.

    # TODO (Practica V2, Accion 5):
    #   Por cada una de las 8 QualityCharacteristic, decide el MeasurementStatus:
    #
    #   - MAINTAINABILITY -> MEASURED (con function_metrics + maintainability_index)
    #   - SECURITY        -> MEASURED (con security_findings de Bandit)
    #   - RELIABILITY     -> MEASURED parcial (errores no manejados) o REQUIRES_HUMAN_JUDGMENT
    #   - FUNCTIONAL_SUITABILITY -> MEASURED si los tests pasan (en v3 se afina)
    #   - PERFORMANCE_EFFICIENCY -> NOT_APPLICABLE (es runtime, v2 no lo mide)
    #   - COMPATIBILITY   -> NOT_APPLICABLE en v2
    #   - PORTABILITY     -> NOT_APPLICABLE en v2
    #   - USABILITY       -> NOT_APPLICABLE (necesita usuarios reales — fuera de alcance M3)
    #
    #   La clave del Tema 2: el agente DECLARA honestamente lo que no mide.
    #   No rellena las 8 celdas en verde — eso seria checkbox compliance.
    #
    # Devuelve: list[QualityCharacteristicResult] con 8 elementos.
    """
    # TODO: implementar la clasificacion ISO 25010
    raise NotImplementedError("Completar clasificar_iso_25010 en la Practica V2")


# ============================================================
# PASO G: Ensamblar el Quality Report  [GIVEN]
# ============================================================
def construir_quality_report(
    function_metrics: list[FunctionMetrics],
    maintainability_index: float | None,
    security_findings: list[SecurityFinding],
    iso_coverage: list[QualityCharacteristicResult],
) -> QualityReport:
    """Ensambla el Quality Report a partir de las piezas medidas."""
    exceeding = sum(1 for fm in function_metrics if fm.exceeds_threshold)
    return QualityReport(
        function_metrics=function_metrics,
        maintainability_index=maintainability_index,
        security_findings=security_findings,
        iso_25010_coverage=iso_coverage,
        functions_exceeding_threshold=exceeding,
    )


# ============================================================
# PIPELINE COMPLETO V2  [GIVEN — orquesta lo que las estudiantes completan]
# ============================================================
def pipeline_v2(contract_b: GherkinTestSuite) -> CodeGenerationResult:
    """Ejecuta el pipeline completo de M3-V2: genera codigo + lo analiza."""
    print("=" * 60)
    print("AGENTE M3-V2 — Code Generator + Analisis Estatico")
    print("=" * 60)

    client = Groq(api_key=GROQ_API_KEY)
    modelo, collection = inicializar_kb()

    todos_modulos: list[GeneratedCodeModule] = []
    todos_tests: list[GeneratedTest] = []

    # FASE 1: generacion (reusa lo de V1)
    for feature in contract_b.features:
        print(f"\nFeature {feature.user_story_id}: {feature.name}")
        patrones = buscar_patrones_similares(modelo, collection, feature, top_k=3)
        system_prompt, user_message = construir_prompt(feature, patrones)
        raw_response = generar_con_groq(client, system_prompt, user_message)
        modulos, tests = parsear_respuesta(raw_response, feature)
        todos_modulos.extend(modulos)
        todos_tests.extend(tests)
        print(f"   Generado: {len(modulos)} modulo(s), {len(tests)} test(s)")

    # FASE 2: analisis estatico (lo nuevo de V2)
    print(f"\nPASO V2: Analisis estatico del codigo generado")
    code_dir = volcar_codigo_a_disco(todos_modulos)
    radon_data = ejecutar_radon(code_dir)
    complexipy_data = ejecutar_complexipy(code_dir)
    security_findings = ejecutar_bandit(code_dir)
    function_metrics = construir_function_metrics(radon_data, complexipy_data)

    # MI promedio de los archivos (radon mi)
    mi_values = [v["mi"] for v in radon_data.get("mi", {}).values()]
    maintainability_index = round(sum(mi_values) / len(mi_values), 2) if mi_values else None

    iso_coverage = clasificar_iso_25010(function_metrics, security_findings, maintainability_index)
    quality_report = construir_quality_report(
        function_metrics, maintainability_index, security_findings, iso_coverage
    )

    print(f"   Funciones medidas: {len(function_metrics)}")
    print(f"   Funciones sobre umbral: {quality_report.functions_exceeding_threshold}")
    print(f"   Hallazgos de seguridad: {len(security_findings)}")
    print(f"   Maintainability Index: {maintainability_index}")

    resultado = CodeGenerationResult(
        pipeline_run_id=f"v2-{uuid.uuid4().hex[:8]}",
        agent_version="0.2.0-v2-analisis-estatico",
        source_contract_b_id=contract_b.pipeline_run_id,
        generated_code=todos_modulos,
        generated_tests=todos_tests,
        quality_report=quality_report,
        total_modules=len(todos_modulos),
        total_tests=len(todos_tests),
        # traceability_matrix, coverage_report -> None (los resuelve V3)
    )
    return resultado


def imprimir_limitaciones():
    """Limitaciones de V2 que motivan V3-V4."""
    print(f"\n{'=' * 60}")
    print(f"LIMITACIONES DE V2 (oportunidades de mejora)")
    print(f"{'=' * 60}")
    print(f"   - Sin trazabilidad — no se verifica que cada escenario tenga test")
    print(f"     Solucion: V3 construye la matriz de trazabilidad CMMI L3")
    print(f"   - Sin coverage — no se sabe que tan probado esta el codigo")
    print(f"     Solucion: V3 corre pytest-cov y reporta branch coverage")
    print(f"   - Sin HITL del desarrollador senior")
    print(f"     Solucion: V4 agrega revision humana antes de aprobar el Contract C")


if __name__ == "__main__":
    contract_b_path = input(
        "\nRuta al Contract B JSON (Enter para usar el ejemplo incluido en M3):\n> "
    ).strip()
    if not contract_b_path:
        contract_b_path = str(
            Path(__file__).parent / "examples" / "contract_b_login_ejemplo.json"
        )

    contract_b = cargar_contract_b(contract_b_path)
    resultado = pipeline_v2(contract_b)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"contract_c_v2_{timestamp}.json"
    output_path.write_text(resultado.model_dump_json(indent=2), encoding="utf-8")
    print(f"\nContract C guardado en: {output_path}")

    imprimir_limitaciones()
