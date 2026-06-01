"""review_cli_dev.py (M3-V4): HITL del desarrollador senior.

Cuarta y ultima version del flujo del Modulo 3. NO es un agente generador:
es la herramienta que incorpora al desarrollador senior humano DENTRO del
pipeline (HITL — Human-in-the-Loop).

Concepto nuevo de v4:
    El analisis estatico de V2 y V3 mide lo OBJETIVO (CC, CogC, MI, cobertura,
    trazabilidad). Pero hay cosas que ninguna herramienta mide:
        - naming (nombres que reflejan o no la intencion)
        - design intent (la estructura del codigo cuenta una historia coherente?)
        - code smells subjetivos (acoplamiento sutil, abstracciones prematuras)
        - Functional Appropriateness (la solucion resuelve el problema real?)
    El desarrollador senior revisa el Contract C, deja sus decisiones en el
    change_history (auditable para CMMI L3), y firma: aprueba, rechaza o
    solicita cambios. Sin esa firma, el Contract C NO avanza al Modulo 4.

    V4 no garantiza que el codigo sea perfecto. V4 lo hace DEFENDIBLE.

==============================================================
ESQUELETO PARA LA PRACTICA V4 — las estudiantes completan los bloques # TODO
siguiendo el handout practica_v4_m3_estudiantes.md
==============================================================

Ejecutar:
    python review_cli_dev.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from modulo3_code_generator.src.contract_c import (
    CodeGenerationResult,
    ReviewChange,
    ReviewMetadata,
    ReviewStatus,
)


# ============================================================
# PASO 1: Cargar el Contract C a revisar  [GIVEN]
# ============================================================
def cargar_contract_c(path: str) -> CodeGenerationResult:
    """Carga un Contract C generado por V3 desde un archivo JSON."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return CodeGenerationResult(**data)


def listar_contracts_c_disponibles() -> list[Path]:
    """Lista los Contract C disponibles en output/, mas reciente primero."""
    output_dir = Path(__file__).parent / "output"
    if not output_dir.exists():
        return []
    archivos = sorted(
        output_dir.glob("contract_c_v3_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return archivos


# ============================================================
# PASO 2: Mostrar el resumen del Contract C  [GIVEN]
# ============================================================
def mostrar_resumen(resultado: CodeGenerationResult) -> None:
    """Imprime un resumen del Contract C para orientar al revisor."""
    print("\n" + "=" * 60)
    print(f"CONTRACT C — {resultado.pipeline_run_id}")
    print("=" * 60)
    print(f"   Modulos de codigo: {resultado.total_modules}")
    print(f"   Tests generados: {resultado.total_tests}")
    if resultado.quality_report:
        qr = resultado.quality_report
        print(f"   Funciones sobre umbral CC/CogC: {qr.functions_exceeding_threshold}")
        print(f"   Hallazgos de seguridad: {len(qr.security_findings)}")
        print(f"   Maintainability Index: {qr.maintainability_index}")
    if resultado.traceability_matrix:
        tm = resultado.traceability_matrix
        print(f"   Cobertura de requisitos: {tm.requirements_coverage_pct:.1f}%")
        print(f"   Huerfanos forward: {tm.orphan_scenarios}")
        print(f"   Huerfanos backward: {tm.orphan_tests}")
        print(f"   CMMI L3 compliant: {tm.cmmi_l3_compliant}")
    if resultado.coverage_report:
        print(f"   Branch coverage: {resultado.coverage_report.branch_coverage_pct:.1f}%")
    print(f"   Estado de revision actual: {resultado.review.review_status.value}")


# ============================================================
# PASO 3: Registrar una decision del revisor en el change_history
# ============================================================
def registrar_decision(
    review: ReviewMetadata,
    reviewer: str,
    action: str,
    target: str | None = None,
    notes: str | None = None,
) -> None:
    """Agrega una entrada al change_history del Contract C.

    # TODO (Practica V4, Accion 1):
    #   1. Construir un ReviewChange con timestamp actual, reviewer, action,
    #      target y notes.
    #   2. Agregarlo a review.change_history.
    #
    #   Esta funcion es el corazon de la auditabilidad CMMI L3: cada decision
    #   del revisor queda registrada con quien, cuando, sobre que y por que.
    #   Sin change_history, la revision humana no es trazable y no es defendible.
    """
    # TODO: implementar el registro de la decision
    raise NotImplementedError("Completar registrar_decision en la Practica V4")


# ============================================================
# PASO 4: Aplicar el veredicto final del revisor
# ============================================================
def aplicar_veredicto(
    review: ReviewMetadata,
    reviewer: str,
    veredicto: str,
    feedback: str | None = None,
) -> None:
    """Aplica el veredicto final del desarrollador senior sobre el Contract C.

    # TODO (Practica V4, Accion 2):
    #   Segun el veredicto ('aprobar' | 'rechazar' | 'cambios'):
    #   - aprobar  -> review_status = APPROVED, approved_by = reviewer,
    #                 approved_at = ahora.
    #   - rechazar -> review_status = REJECTED.
    #   - cambios  -> review_status = NEEDS_CHANGES, version += 1.
    #   En los tres casos: guardar reviewer_feedback y registrar la decision
    #   en el change_history (reusa registrar_decision).
    #
    #   Recuerda: sin review_status == APPROVED, el Contract C NO debe avanzar
    #   al Modulo 4.
    """
    # TODO: implementar la aplicacion del veredicto
    raise NotImplementedError("Completar aplicar_veredicto en la Practica V4")


# ============================================================
# PASO 5: Bucle de revision interactivo  [GIVEN — usa lo que completaste arriba]
# ============================================================
def revisar_interactivo(resultado: CodeGenerationResult, reviewer: str) -> None:
    """Recorre el Contract C modulo por modulo y recoge las decisiones del revisor."""
    review = resultado.review

    for modulo in resultado.generated_code:
        print("\n" + "-" * 60)
        print(f"MODULO: {modulo.filename}  (historia {modulo.user_story_id})")
        print("-" * 60)
        print(modulo.source_code)
        print("-" * 60)
        print("Lo que las metricas NO ven y tu SI debes juzgar:")
        print("  - naming: los nombres reflejan la intencion?")
        print("  - design intent: la estructura cuenta una historia coherente?")
        print("  - code smells: acoplamiento sutil, abstracciones prematuras?")
        print("  - appropriateness: resuelve el problema real del escenario?")

        opcion = input(
            "\n[a]ceptar modulo  [c]omentar/marcar smell  [s]altar : "
        ).strip().lower()

        if opcion == "c":
            nota = input("   Tu observacion como revisor senior: ").strip()
            registrar_decision(
                review, reviewer, action="smell_flagged",
                target=modulo.filename, notes=nota,
            )
            print("   Observacion registrada en el change_history.")
        elif opcion == "a":
            registrar_decision(
                review, reviewer, action="comment_added",
                target=modulo.filename, notes="Modulo aceptado por el revisor",
            )

    # Veredicto final
    print("\n" + "=" * 60)
    print("VEREDICTO FINAL DEL DESARROLLADOR SENIOR")
    print("=" * 60)
    veredicto_input = input(
        "[a]probar  [r]echazar  [n] solicitar cambios : "
    ).strip().lower()
    feedback = input("Comentario libre sobre el Contract C completo: ").strip()

    mapa = {"a": "aprobar", "r": "rechazar", "n": "cambios"}
    veredicto = mapa.get(veredicto_input, "cambios")
    aplicar_veredicto(review, reviewer, veredicto, feedback or None)
    print(f"\nVeredicto aplicado: {review.review_status.value}")


# ============================================================
# EJECUCION  [GIVEN]
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("M3-V4 — Revision del desarrollador senior (HITL)")
    print("=" * 60)

    disponibles = listar_contracts_c_disponibles()
    if not disponibles:
        print("\nNo hay Contract C de V3 en output/. Corre primero agente_v3_trazabilidad.py")
        sys.exit(1)

    print("\nContract C disponibles (mas reciente primero):")
    for i, archivo in enumerate(disponibles[:10]):
        print(f"   [{i}] {archivo.name}")
    idx = input("\nNumero del Contract C a revisar (Enter = 0): ").strip()
    archivo = disponibles[int(idx) if idx else 0]

    reviewer = input("Tu identificador (formato nombre.apellido): ").strip()
    if not reviewer:
        print("Error: se requiere un identificador de revisor para la trazabilidad CMMI L3")
        sys.exit(1)

    resultado = cargar_contract_c(str(archivo))
    mostrar_resumen(resultado)
    revisar_interactivo(resultado, reviewer)

    # Guardar el Contract C revisado
    salida = archivo.with_name(archivo.stem + "_reviewed.json")
    salida.write_text(resultado.model_dump_json(indent=2), encoding="utf-8")
    print(f"\nContract C revisado guardado en: {salida}")
    print(f"Entradas en el change_history: {len(resultado.review.change_history)}")
