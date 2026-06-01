"""Agente v1 (M3) — VERSION SOLUCION (uso docente, no subir al repo).

Misma estructura que agente_v1_base.py pero con los tres TODOs ya completos.
Sirve como referencia para mostrar en clase si alguna pareja se atasca o para
verificar end-to-end que el pipeline cierra y genera un Contract C valido.

NO ES PARA LAS ESTUDIANTES. El archivo que ellas completan es agente_v1_base.py.

Esta es la primera version del agente del Modulo 3 (Code Generator).
ASUME conocidos los conceptos de M1 y M2: tokenizacion, embeddings,
ChromaDB, RAG, JSON estructurado con Pydantic, retry de validacion,
heuristicas de testing, clasificacion ISO 25010, HITL.
Por eso v1 ya viene con el patron RAG aplicado de fabrica.

Lo que evolucionara en v2, v3, v4 son los conceptos NUEVOS del Modulo 3:
    v2: analisis estatico (radon, complexipy, Bandit) + Quality Report ISO 25010
    v3: cobertura (pytest-cov) + matriz de trazabilidad CMMI L3
    v4: HITL del desarrollador senior que revisa el Contract C

Limitaciones de esta version (se resuelven en versiones siguientes):
    Sin metricas de calidad — el codigo se genera pero no se mide (v2 lo resuelve)
    Sin trazabilidad — no se verifica que cada escenario tenga test (v3)
    Sin coverage — no se sabe que tan probado esta el codigo (v3)
    Sin HITL — el output va directo del LLM al disco (v4)

Pipeline:
    Contract B -> para cada feature -> embedding -> buscar patrones de codigo Katary
    -> prompt enriquecido con patrones -> Groq -> JSON -> Pydantic
    -> GeneratedCodeModule + GeneratedTest -> construir CodeGenerationResult (Contract C)

==============================================================
ESQUELETO PARA LA PRACTICA V1 — las estudiantes completan los bloques marcados
con # TODO siguiendo el handout practica_v1_m3_estudiantes.md
==============================================================

Ejecutar:
    python agente_v1_base.py
"""

import json
import os
import sys
import uuid
import warnings
from datetime import datetime
from pathlib import Path

warnings.filterwarnings("ignore")

from dotenv import load_dotenv
from groq import Groq
from pydantic import ValidationError
from sentence_transformers import SentenceTransformer
import chromadb

# Asegurar que la raiz del proyecto este en sys.path para imports cross-module
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Contract B re-exportado desde el Modulo 2 (entrada del agente)
from modulo2_test_architect.src.contract_b import (
    GherkinFeature,
    GherkinScenario,
    GherkinTestSuite,
)

# Contract C (salida del agente)
from modulo3_code_generator.src.contract_c import (
    CodeGenerationResult,
    GeneratedCodeModule,
    GeneratedTest,
)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("Error: No se encontro GROQ_API_KEY en el archivo .env")
    sys.exit(1)


# ============================================================
# PASO 1: Cargar Contract B desde JSON  [GIVEN — ya resuelto]
# ============================================================
def cargar_contract_b(path: str) -> GherkinTestSuite:
    """Carga el Contract B producido por el Modulo 2 desde un archivo JSON.

    Pydantic valida la estructura automaticamente al construir el modelo.
    """
    print(f"\nPASO 1: Cargando Contract B desde {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    contract_b = GherkinTestSuite(**data)

    total_scenarios = sum(len(f.scenarios) for f in contract_b.features)
    print(f"   Contract B cargado:")
    print(f"      Pipeline ID: {contract_b.pipeline_run_id}")
    print(f"      Features: {len(contract_b.features)}")
    print(f"      Escenarios totales: {total_scenarios}")
    return contract_b


# ============================================================
# PASO 2: Inicializar la KB de patrones de codigo Katary (RAG)  [GIVEN]
# ============================================================
def inicializar_kb():
    """Carga el modelo de embeddings y la KB de patrones de codigo Katary.

    Mismo patron de M1 y M2 (embeddings + ChromaDB persistente), pero apuntando
    a los patrones de CODIGO en lugar de a patrones de testing.
    """
    print(f"\nPASO 2: Inicializando KB de patrones de codigo Katary")
    print("   Cargando modelo de embeddings (all-MiniLM-L6-v2)...")
    modelo = SentenceTransformer("all-MiniLM-L6-v2")

    kb_path = Path(__file__).parent / "knowledge_base_data"
    client = chromadb.PersistentClient(path=str(kb_path))
    collection = client.get_or_create_collection(
        name="katary_code_patterns",
        metadata={"hnsw:space": "cosine"},
    )

    if collection.count() == 0:
        patterns_path = (
            Path(__file__).parent / "examples" / "knowledge_base" / "katary_code_patterns.json"
        )
        print(f"   Indexando patrones desde {patterns_path.name}...")
        with open(patterns_path, "r", encoding="utf-8") as f:
            patterns = json.load(f)

        # Lo que se embedea: domain + code_pattern_typical + katary_context
        textos = [
            f"{p['domain']}. {p['code_pattern_typical']}. {p['katary_context']}"
            for p in patterns
        ]
        embeddings = modelo.encode(textos).tolist()
        collection.add(
            ids=[p["id"] for p in patterns],
            embeddings=embeddings,
            documents=textos,
            metadatas=[
                {
                    "domain": p["domain"],
                    "quality_practices": json.dumps(p["quality_practices"], ensure_ascii=False),
                    "typical_functions": json.dumps(p["typical_functions"], ensure_ascii=False),
                    "common_smells": json.dumps(p["common_smells"], ensure_ascii=False),
                    "lessons_learned_katary": p["lessons_learned_katary"],
                }
                for p in patterns
            ],
        )
        print(f"   {collection.count()} patrones indexados en ChromaDB")
    else:
        print(f"   KB existente: {collection.count()} patrones cargados")

    return modelo, collection


# ============================================================
# PASO 3: Buscar patrones de codigo similares (Retrieval)
# ============================================================
def buscar_patrones_similares(modelo, collection, feature: GherkinFeature, top_k: int = 3):
    """Busca los patrones de codigo Katary mas similares a una feature.

    # TODO (Practica V1, Accion 2):
    #   1. Construir el texto de consulta a partir de la feature.
    #      Pista: usa feature.name + feature.description + los nombres de
    #      los escenarios. Mientras mas vocabulario relevante, mejor recupera el RAG.
    #   2. Calcular el embedding de la consulta con modelo.encode([...]).
    #   3. Llamar a collection.query(...) con n_results=top_k.
    #   4. Armar la lista de patrones con: id, domain, quality_practices,
    #      typical_functions, common_smells, lessons_learned_katary, similitud.
    #      Recuerda: similitud = 1 - distancia.
    #
    # Devuelve: list[dict] con los patrones encontrados.
    """
    # 1. Construir el texto de consulta a partir de la feature.
    #    Concatenamos nombre + descripcion + nombres de escenarios para que el
    #    embedding capture todo el vocabulario relevante del caso de uso.
    nombres_escenarios = " ".join(s.name for s in feature.scenarios)
    consulta = f"{feature.name}. {feature.description}. {nombres_escenarios}"

    # 2. Embedear la consulta con el mismo modelo que indexo la KB.
    query_embedding = modelo.encode([consulta]).tolist()

    # 3. Consultar ChromaDB pidiendo los top_k vecinos mas cercanos.
    resultados = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
    )

    # 4. Empaquetar los resultados. La metadata trae listas serializadas como
    #    string JSON (limitacion del schema de ChromaDB), por eso json.loads.
    #    Similitud = 1 - distancia (espacio coseno: distancia chica = muy parecido).
    patrones = []
    for idx in range(len(resultados["ids"][0])):
        metadata = resultados["metadatas"][0][idx]
        distancia = resultados["distances"][0][idx]
        patrones.append(
            {
                "id": resultados["ids"][0][idx],
                "domain": metadata["domain"],
                "quality_practices": json.loads(metadata["quality_practices"]),
                "typical_functions": json.loads(metadata["typical_functions"]),
                "common_smells": json.loads(metadata["common_smells"]),
                "lessons_learned_katary": metadata["lessons_learned_katary"],
                "similitud": 1 - distancia,
            }
        )
    return patrones


# ============================================================
# PASO 4: Construir el prompt enriquecido con RAG (Augmented)
# ============================================================
def construir_prompt(feature: GherkinFeature, patrones: list[dict]) -> tuple[str, str]:
    """Construye el prompt para que el LLM genere codigo + tests.

    LIMITACION DELIBERADA DE V1: el prompt pide generar codigo y tests, pero
    NO instruye al LLM a respetar umbrales de complejidad, ni a poner markers
    de trazabilidad, ni a maximizar cobertura. Eso llega en v2 y v3.
    El proposito de v1 es ser la linea base del ablation study.

    # TODO (Practica V1, Accion 3):
    #   1. Construir 'contexto_kb' recorriendo los patrones: por cada uno,
    #      incluir domain, quality_practices, typical_functions, common_smells
    #      y lessons_learned_katary.
    #   2. Construir el 'system' prompt: el LLM es un generador de codigo Python.
    #      Debe devolver UNICAMENTE un JSON con esta estructura:
    #      {
    #        "modules": [
    #          {"filename": "...", "source_code": "...", "description": "..."}
    #        ],
    #        "tests": [
    #          {"test_name": "...", "source_code": "...", "target_module": "...",
    #           "scenario_ids": ["SCN-..."]}
    #        ]
    #      }
    #   3. Construir el 'user' prompt con la feature: nombre, descripcion,
    #      user_story_id, y cada escenario con sus pasos Given/When/Then.
    #      IMPORTANTE: incluir el ID de cada escenario para que el LLM lo
    #      pueda referenciar en scenario_ids (base de la trazabilidad de v3).
    #
    # Devuelve: (system_prompt, user_message)
    """
    # 1. Construir el contexto enriquecido a partir de los patrones recuperados.
    bloques_kb = []
    for p in patrones:
        bloques_kb.append(
            f"--- Patron: {p['domain']} (similitud {p['similitud']:.2f}) ---\n"
            f"Practicas de calidad: {', '.join(p['quality_practices'])}\n"
            f"Funciones tipicas: {', '.join(p['typical_functions'])}\n"
            f"Smells comunes a evitar: {', '.join(p['common_smells'])}\n"
            f"Leccion aprendida en Katary: {p['lessons_learned_katary']}\n"
        )
    contexto_kb = "\n".join(bloques_kb)

    # 2. System prompt: rol + estructura de salida JSON estricta.
    #    LIMITACION DELIBERADA DE V1: no se pide nada de complejidad, ni de
    #    cobertura, ni de seguridad. Eso es lo que motiva V2 y V3.
    system_prompt = (
        "Eres un generador de codigo Python. Recibes una feature con escenarios "
        "Gherkin y debes devolver UNICAMENTE un objeto JSON con esta estructura, "
        "sin texto antes ni despues, sin bloques de markdown:\n"
        "{\n"
        '  "modules": [\n'
        '    {"filename": "<archivo.py>", "source_code": "<codigo>", "description": "<que hace>"}\n'
        "  ],\n"
        '  "tests": [\n'
        '    {"test_name": "<nombre>", "source_code": "<codigo>", '
        '"target_module": "<archivo.py>", "scenario_ids": ["<AC-XXX>"]}\n'
        "  ]\n"
        "}\n\n"
        "Usa el contexto de patrones Katary como guia de calidad y estilo."
    )

    # 3. User message: feature + escenarios CON su acceptance_criterion_id visible
    #    para que el LLM pueda referenciarlos en scenario_ids. Sin ese ID en el
    #    prompt, todos los tests salen huerfanos (lo que V3 detecta).
    bloques_escenarios = []
    for s in feature.scenarios:
        pasos = "\n".join(f"  {step.keyword} {step.text}" for step in s.steps)
        bloques_escenarios.append(
            f"Escenario [{s.acceptance_criterion_id}] {s.name}\n{pasos}"
        )
    escenarios_txt = "\n\n".join(bloques_escenarios)

    user_message = (
        f"CONTEXTO DE PATRONES KATARY (RAG):\n{contexto_kb}\n\n"
        f"FEATURE A IMPLEMENTAR:\n"
        f"Nombre: {feature.name}\n"
        f"Descripcion: {feature.description}\n"
        f"User Story: {feature.user_story_id}\n\n"
        f"ESCENARIOS:\n{escenarios_txt}\n\n"
        f"Genera el codigo Python que implementa esta feature y los tests Pytest. "
        f"En cada test, scenario_ids debe contener los IDs (entre corchetes arriba) "
        f"de los escenarios que ese test verifica."
    )

    return system_prompt, user_message


# ============================================================
# PASO 5: Llamar a Groq (Generation)  [GIVEN — heredado de M1/M2]
# ============================================================
def generar_con_groq(client: Groq, system_prompt: str, user_message: str) -> str:
    """Envia el prompt a Groq y retorna la respuesta como texto.

    Determinismo activado de fabrica (heredado de M1):
       temperature=0.0 (greedy decoding)
       seed=42 (mismo punto de partida del muestreo)
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt + "\n\nIMPORTANTE: Devuelve SOLO JSON. No incluyas explicaciones, markdown, ni texto antes o despues del JSON."},
                {"role": "user", "content": user_message},
            ],
            temperature=0.0,
            seed=42,
            max_tokens=16000,
        )
        raw = response.choices[0].message.content
        if not raw or not raw.strip():
            raise ValueError("Respuesta vacia de Groq")
    except Exception as e:
        print(f"  [GROQ M3] Error llamando a Groq: {e}")
        raise
    print(f"  [GROQ M3] respuesta cruda ({len(raw)} chars): {raw[:300]}...")
    return raw


# ============================================================
# PASO 5.5: Parser JSON lení (fallback cuando json.loads falla)
# ============================================================
def _parsear_json_leno(texto: str) -> dict:
    """Parser JSON tolerante a comillas sin escapar dentro de strings.

    Recorre caracter por caracter distinguiendo si estamos en una clave
    (despues de '{' o ',') o en un valor (despues de ':').
    Solo escapa comillas que esten dentro de valores string.
    """
    resultado = []
    i = 0
    en_string = False
    esperando_valor = False  # True despues de ':', False despues de '{', ','
    caracter_escape = False
    while i < len(texto):
        c = texto[i]
        if caracter_escape:
            resultado.append(c)
            caracter_escape = False
            i += 1
            continue
        if c == '\\':
            resultado.append(c)
            caracter_escape = True
            i += 1
            continue
        if c == '"':
            if en_string:
                # Cerrando string — es cierre si sigue ',', ']', '}' o espacio
                resto = texto[i+1:].lstrip()
                if resto and resto[0] in ',]}':
                    en_string = False
                    resultado.append(c)
                    if resto[0] == '}':
                        esperando_valor = False
                    elif resto[0] == ',':
                        esperando_valor = False
                else:
                    # Comilla dentro del valor string -> escapar
                    resultado.append('\\"')
            else:
                en_string = True
                resultado.append(c)
        elif c == ':':
            resultado.append(c)
            if not en_string:
                esperando_valor = True
        elif c == ',':
            resultado.append(c)
            if not en_string:
                esperando_valor = False
        elif c in '{[':
            resultado.append(c)
            if not en_string:
                esperando_valor = False
        elif c in ']}':
            resultado.append(c)
            if not en_string:
                esperando_valor = False
        else:
            resultado.append(c)
        i += 1
    return json.loads(''.join(resultado))


# ============================================================
# PASO 6: Parsear respuesta del LLM a objetos del Contract C
# ============================================================
def parsear_respuesta(raw_text: str, feature: GherkinFeature):
    """Parsea el JSON crudo del LLM en GeneratedCodeModule + GeneratedTest.

    # TODO (Practica V1, Accion 4):
    #   1. Limpiar el texto si viene en formato markdown (```json ... ```).
    #   2. Extraer el bloque JSON (desde el primer '{' hasta el ultimo '}').
    #   3. Para cada item de data["modules"], construir un GeneratedCodeModule
    #      (recuerda pasar user_story_id=feature.user_story_id).
    #   4. Para cada item de data["tests"], construir un GeneratedTest
    #      (incluye scenario_ids tal como el LLM los devolvio — en v1 puede
    #      venir vacio o incompleto; eso es esperado, v3 lo audita).
    #
    # Devuelve: (list[GeneratedCodeModule], list[GeneratedTest])
    """
    # 1. Limpiar markdown si el LLM envolvio el JSON en fences.
    texto = raw_text.strip()
    if texto.startswith("```"):
        # quitar la linea de apertura del fence (```json o ```)
        texto = texto.split("\n", 1)[1] if "\n" in texto else texto[3:]
    if texto.endswith("```"):
        texto = texto.rsplit("```", 1)[0]
    texto = texto.strip()

    # 2. Extraer el bloque JSON desde el primer { hasta el ultimo }.
    inicio = texto.find("{")
    fin = texto.rfind("}")
    if inicio == -1 or fin == -1 or fin <= inicio:
        # Fallback: si el LLM solo devolvio "modules": [...] sin { } envolvente,
        # lo envolvemos manualmente.
        if texto.startswith('"modules"') or texto.startswith("modules"):
            texto = "{" + texto + "}"
            inicio = 0
            fin = len(texto) - 1
        else:
            raise ValueError("No se encontro un objeto JSON valido en la respuesta del LLM")
    bloque_json = texto[inicio : fin + 1]

    # 3. Intentar parsear el JSON. Si falla por comillas sin escapar dentro de
    #    strings de codigo (ej: r"regex"), se repara recorriendo caracter por
    #    caracter y escapando comillas dobles que esten dentro de valores string.
    try:
        data = json.loads(bloque_json)
    except json.JSONDecodeError:
        data = _parsear_json_leno(bloque_json)

    # 3. Construir los GeneratedCodeModule. Heredan user_story_id de la feature
    #    (el LLM no lo conoce, lo inyectamos para mantener la trazabilidad).
    modulos: list[GeneratedCodeModule] = []
    for item in data.get("modules", []):
        modulos.append(
            GeneratedCodeModule(
                filename=item["filename"],
                source_code=item["source_code"],
                description=item.get("description", ""),
                user_story_id=feature.user_story_id,
            )
        )

    # 4. Construir los GeneratedTest. scenario_ids puede venir vacio o
    #    incompleto en V1; eso es lo que V3 audita y reporta.
    tests: list[GeneratedTest] = []
    for item in data.get("tests", []):
        tests.append(
            GeneratedTest(
                test_name=item["test_name"],
                source_code=item["source_code"],
                target_module=item.get("target_module", ""),
                scenario_ids=item.get("scenario_ids", []),
            )
        )

    return modulos, tests


# ============================================================
# PASO 7: Construir el Contract C  [GIVEN — ya resuelto]
# ============================================================
def construir_contract_c(
    contract_b: GherkinTestSuite,
    modulos: list[GeneratedCodeModule],
    tests: list[GeneratedTest],
) -> CodeGenerationResult:
    """Ensambla el Contract C a partir del codigo y tests generados.

    En V1 los campos quality_report, traceability_matrix y coverage_report
    quedan en None — esa es justamente la limitacion que v2 y v3 resuelven.
    """
    print(f"\nPASO 7: Construyendo Contract C...")
    resultado = CodeGenerationResult(
        pipeline_run_id=f"v1-{uuid.uuid4().hex[:8]}",
        agent_version="0.1.0-v1-base",
        source_contract_b_id=contract_b.pipeline_run_id,
        generated_code=modulos,
        generated_tests=tests,
        total_modules=len(modulos),
        total_tests=len(tests),
        # quality_report, traceability_matrix, coverage_report -> None (limitacion de V1)
    )
    print(f"   Contract C construido:")
    print(f"      Modulos de codigo: {resultado.total_modules}")
    print(f"      Tests generados: {resultado.total_tests}")
    return resultado


# ============================================================
# PIPELINE COMPLETO  [GIVEN — orquesta los pasos que las estudiantes completan]
# ============================================================
def pipeline_v1(contract_b: GherkinTestSuite) -> CodeGenerationResult:
    """Ejecuta el pipeline completo de M3-V1."""
    print("=" * 60)
    print("AGENTE M3-V1 — Code Generator base (RAG sin metricas)")
    print("=" * 60)

    client = Groq(api_key=GROQ_API_KEY)
    modelo, collection = inicializar_kb()

    todos_modulos: list[GeneratedCodeModule] = []
    todos_tests: list[GeneratedTest] = []

    for feature in contract_b.features:
        print(f"\nFeature {feature.user_story_id}: {feature.name}")
        patrones = buscar_patrones_similares(modelo, collection, feature, top_k=3)
        print(f"   RAG: {len(patrones)} patrones — top1: {patrones[0]['domain']} ({patrones[0]['similitud']:.2f})")

        system_prompt, user_message = construir_prompt(feature, patrones)
        raw_response = generar_con_groq(client, system_prompt, user_message)

        try:
            modulos, tests = parsear_respuesta(raw_response, feature)
            todos_modulos.extend(modulos)
            todos_tests.extend(tests)
            print(f"   Generado: {len(modulos)} modulo(s), {len(tests)} test(s)")
        except (json.JSONDecodeError, ValidationError, KeyError, ValueError) as e:
            print(f"   Error procesando feature {feature.user_story_id}: {e}")
            continue

    return construir_contract_c(contract_b, todos_modulos, todos_tests)


# ============================================================
# LIMITACIONES DE V1  [GIVEN]
# ============================================================
def imprimir_limitaciones():
    """Imprime las limitaciones de V1 que motivan V2-V4."""
    print(f"\n{'=' * 60}")
    print(f"LIMITACIONES DE V1 (oportunidades de mejora)")
    print(f"{'=' * 60}")
    print(f"   - Sin metricas de calidad — el codigo se genera pero no se mide")
    print(f"     Solucion: V2 corre radon, complexipy, Bandit y arma el Quality Report")
    print(f"   - Sin trazabilidad — no se verifica que cada escenario tenga test")
    print(f"     Solucion: V3 construye la matriz de trazabilidad CMMI L3")
    print(f"   - Sin coverage — no se sabe que tan probado esta el codigo")
    print(f"     Solucion: V3 corre pytest-cov y reporta branch coverage")
    print(f"   - Sin HITL del desarrollador senior — el output va directo al disco")
    print(f"     Solucion: V4 agrega revision humana antes de aprobar el Contract C")


# ============================================================
# EJECUCION  [GIVEN]
# ============================================================
if __name__ == "__main__":
    contract_b_path = input(
        "\nRuta al Contract B JSON (Enter para usar el ejemplo incluido en M3):\n> "
    ).strip()

    if not contract_b_path:
        contract_b_path = str(
            Path(__file__).parent / "examples" / "contract_b_login_ejemplo.json"
        )

    contract_b = cargar_contract_b(contract_b_path)
    resultado = pipeline_v1(contract_b)

    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"contract_c_v1_{timestamp}.json"
    output_path.write_text(resultado.model_dump_json(indent=2), encoding="utf-8")
    print(f"\nContract C guardado en: {output_path}")

    imprimir_limitaciones()
