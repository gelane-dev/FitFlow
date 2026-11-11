"""Validações puras de documentos."""
import re


def normalizar_cpf(valor: str | None) -> str | None:
    """CPF só com dígitos (11) e dígitos verificadores corretos; vazio → None; inválido → ValueError."""
    if valor is None:
        return None

    if not valor.strip():
        return None

    digitos = re.sub(r"\D", "", valor)
    if len(digitos) != 11 or digitos == digitos[0] * 11:
        raise ValueError("CPF inválido")

    for tamanho in (9, 10):
        soma = sum(int(d) * peso for d, peso in zip(digitos[:tamanho], range(tamanho + 1, 1, -1)))
        verificador = (soma * 10 % 11) % 10
        if verificador != int(digitos[tamanho]):
            raise ValueError("CPF inválido")

    return digitos
