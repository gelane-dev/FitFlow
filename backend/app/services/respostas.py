from ..models import ItemFicha, Exercicio
from ..schemas.treino import ItemTreinoDiaResposta


def montar_item_treino(item: ItemFicha, exercicio: Exercicio | None = None) -> ItemTreinoDiaResposta:
    """Monta a resposta de um item da ficha com os dados do exercício."""
    exercicio = exercicio or item.exercicio

    return ItemTreinoDiaResposta(
        id=item.id,
        ficha_id=item.ficha_id,
        treino_id=item.treino_id,
        exercicio_id=item.exercicio_id,
        series=item.series,
        repeticoes=item.repeticoes,
        carga=item.carga,
        descanso=item.descanso,
        ordem=item.ordem,
        nome=exercicio.nome,
        descricao=exercicio.descricao,
        grupo_muscular=exercicio.grupo_muscular,
        imagem=exercicio.imagem,
        video=exercicio.video,
    )
