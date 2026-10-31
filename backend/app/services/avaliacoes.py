from ..models import AvaliacaoFisica
from ..schemas.avaliacao import AvaliacaoResposta


def calcular_imc(peso: float, altura: float) -> float:
    """IMC = peso / altura² (kg e metros), com 2 casas."""
    return round(peso / (altura ** 2), 2)


def montar_avaliacao(avaliacao: AvaliacaoFisica) -> AvaliacaoResposta:
    return AvaliacaoResposta(
        id=avaliacao.id,
        aluno_id=avaliacao.aluno_id,
        professor_id=avaliacao.professor_id,
        data_avaliacao=avaliacao.data_avaliacao,
        peso=avaliacao.peso,
        altura=avaliacao.altura,
        percentual_gordura=avaliacao.percentual_gordura,
        massa_muscular=avaliacao.massa_muscular,
        observacao=avaliacao.observacao,
        imc=calcular_imc(avaliacao.peso, avaliacao.altura),
    )
