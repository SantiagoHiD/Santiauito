"""Demo de herramientas de calidad de codigo — Modulo 3 QualityAI.

Este modulo esta DELIBERADAMENTE disenado para mostrar en clase que reporta
cada herramienta:

  - calcular_iva       -> funcion limpia (CC y CogC bajos)
  - aplicar_descuento  -> funcion enmaranada (CC moderado, CogC sobre umbral)
  - calcular_total     -> funcion intermedia que orquesta a las otras dos
  - DB_PASSWORD        -> hallazgo de seguridad INTENCIONAL para que Bandit lo marque

Es material didactico: en codigo real una credencial nunca va hardcodeada.
Aqui esta a proposito para ver el reporte de Bandit.
"""

# Hallazgo de seguridad INTENCIONAL para la demo (Bandit lo marca como B105).
DB_PASSWORD = "katary-demo-1234"


def calcular_iva(subtotal):
    """Funcion limpia: un solo camino, sin decisiones. CC = 1, CogC = 0."""
    return round(subtotal * 0.19, 2)


def aplicar_descuento(monto, tipo_cliente, antiguedad, region):
    """Funcion enmaranada a proposito: anidamiento profundo.

    CC moderado (pasa el umbral de 10), pero CogC alto (lo supera).
    Es el ejemplo en vivo de "CC pasa, CogC reprueba".
    """
    descuento = 0
    if tipo_cliente == "premium":
        if antiguedad > 5:
            if region == "nacional":
                descuento = 0.25
            else:
                descuento = 0.20
        else:
            if monto > 1000000:
                descuento = 0.15
            else:
                descuento = 0.10
    elif tipo_cliente == "regular":
        if monto > 500000:
            descuento = 0.05
        else:
            descuento = 0.02
    return monto * (1 - descuento)


def calcular_total(subtotal, tipo_cliente, antiguedad, region):
    """Funcion intermedia: aplica el descuento y le suma el IVA."""
    con_descuento = aplicar_descuento(subtotal, tipo_cliente, antiguedad, region)
    iva = calcular_iva(con_descuento)
    return con_descuento + iva
