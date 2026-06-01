"""Gestor de pedidos — modulo deliberadamente disenado con 3 perfiles de complejidad.

- validar_pedido: funcion simple (CC y CogC bajos).
- estado_pedido: muchas ramas planas (CC alto, CogC moderado).
- calcular_envio: ramas anidadas (CC moderado, CogC alto).

Es el insumo de la practica de cierre: medir, interpretar y decidir.
"""

import datetime


def validar_pedido(pedido):
    """Valida que un pedido tenga los campos minimos. Simple."""
    if not isinstance(pedido, dict):
        return False
    if "items" not in pedido or not pedido["items"]:
        return False
    if "cliente" not in pedido:
        return False
    return True


def estado_pedido(codigo):
    """Mapea un codigo de estado a un texto legible. Plano: muchos elif."""
    if codigo == "P":
        return "Pendiente"
    elif codigo == "C":
        return "Confirmado"
    elif codigo == "PR":
        return "Preparando"
    elif codigo == "E":
        return "Enviado"
    elif codigo == "T":
        return "En transito"
    elif codigo == "D":
        return "Entregado"
    elif codigo == "X":
        return "Cancelado"
    elif codigo == "R":
        return "Devuelto"
    else:
        return "Desconocido"


def calcular_envio(peso, destino, urgente, cliente_premium):
    """Calcula el costo de envio. Anidado: estructura nested deliberada."""
    costo = 0
    if peso > 0:
        if destino == "nacional":
            if urgente:
                if peso < 5:
                    costo = 25000
                else:
                    if peso < 20:
                        costo = 40000
                    else:
                        costo = 60000
            else:
                if peso < 5:
                    costo = 15000
                else:
                    costo = 25000
        elif destino == "internacional":
            if urgente:
                if peso < 5:
                    costo = 80000
                else:
                    costo = 150000
            else:
                if peso < 5:
                    costo = 50000
                else:
                    costo = 90000
        if cliente_premium:
            costo = int(costo * 0.85)
    return costo
