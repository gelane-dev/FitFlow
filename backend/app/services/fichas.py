from datetime import date

from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..core.seguranca import obter_usuario_atual, verificar_professor
from ..core.tempo import agora, agora_naive
from ..database import get_db
from ..models import Aluno, Exercicio, Ficha, ItemFicha, Treino, User
from ..schemas.ficha import AtualizarFichaCompleta, FichaCompletaResposta, TreinoComItensResposta
from . import auditoria
from .respostas import montar_item_treino

MENSAGEM_DATA_FIM = "A data final deve ser posterior à data inicial"
MENSAGEM_ORDEM_TREINO = "Já existe um treino com esta ordem nesta ficha"
MENSAGEM_ORDEM_ITEM = "Já existe um exercício com esta ordem neste treino"


def hoje() -> date:
    return agora().date()


def data_inicio_efetiva(ficha: Ficha) -> date:
    """Fichas antigas (sem data_inicio) usam a data de criação."""
    return ficha.data_inicio or ficha.data_criacao.date()


def esta_vigente(ficha: Ficha, dia: date | None = None) -> bool:
    dia = dia or hoje()
    if not ficha.ativo:
        return False
    if data_inicio_efetiva(ficha) > dia:
        return False
    return ficha.data_fim is None or ficha.data_fim >= dia


def validar_periodo(data_inicio: date, data_fim: date | None) -> None:
    if data_fim is not None and data_fim < data_inicio:
        raise HTTPException(status_code=400, detail=MENSAGEM_DATA_FIM)


def dados_vigencia(ficha: Ficha, dia: date | None = None) -> dict:
    """Campos de vigência comuns às respostas de ficha."""
    return {
        "data_inicio": data_inicio_efetiva(ficha),
        "data_fim": ficha.data_fim,
        "vigente": esta_vigente(ficha, dia),
    }


def contar_treinos_por_ficha(db: Session, ficha_ids: list[int]) -> dict[int, int]:
    """Treinos ativos de cada ficha, em uma única consulta agregada (sem N+1)."""
    if not ficha_ids:
        return {}
    linhas = db.execute(
        select(Treino.ficha_id, func.count(Treino.id))
        .where(Treino.ficha_id.in_(ficha_ids), Treino.ativo.is_(True))
        .group_by(Treino.ficha_id)
    ).all()
    return {ficha_id: total for ficha_id, total in linhas}


def contar_itens_por_treino(db: Session, treino_ids: list[int]) -> dict[int, int]:
    """Itens ativos de cada treino, em uma única consulta agregada (sem N+1)."""
    if not treino_ids:
        return {}
    linhas = db.execute(
        select(ItemFicha.treino_id, func.count(ItemFicha.id))
        .where(ItemFicha.treino_id.in_(treino_ids), ItemFicha.ativo.is_(True))
        .group_by(ItemFicha.treino_id)
    ).all()
    return {treino_id: total for treino_id, total in linhas}


def ator_professor_ou_admin(usuario: User = Depends(obter_usuario_atual), db: Session = Depends(get_db)):
    """Como verificar_professor_ou_admin, mas outros perfis recebem o 403 antigo ("apenas para professor"):
    rotas que já eram só de professor não mudam de mensagem (contrato aditivo)."""
    if usuario.tipo == "admin":
        return "admin", usuario
    return "professor", verificar_professor(usuario, db)


def usuario_do_ator(ator: tuple) -> User:
    """User de quem age: o próprio admin, ou o usuário do perfil Professor."""
    tipo, perfil = ator
    return perfil if tipo == "admin" else perfil.user


def obter_ficha_gerenciavel(
    db: Session, ator: tuple, ficha_id: int, mensagem_403: str, somente_ativa: bool = True
) -> Ficha:
    """Ficha que o ator pode ler/editar: admin qualquer uma; professor só as próprias (403 com `mensagem_403`)."""
    consulta = select(Ficha).where(Ficha.id == ficha_id)
    if somente_ativa:
        consulta = consulta.where(Ficha.ativo.is_(True))
    ficha = db.scalar(consulta)

    if not ficha:
        raise HTTPException(status_code=404, detail="Ficha não encontrada")

    tipo, perfil = ator
    # ADR-038: além de ser o autor, o aluno da ficha precisa estar vinculado ao professor
    if tipo == "professor" and (ficha.professor_id != perfil.id or ficha.aluno.professor_id != perfil.id):
        raise HTTPException(status_code=403, detail=mensagem_403)

    return ficha


def transferir_fichas_do_aluno(db: Session, aluno_ids: list[int], destino_professor_id: int | None) -> list[int]:
    """ADR-038: as fichas ativas dos alunos passam para o novo professor (sem commit); devolve os ids.

    Sem destino (aluno sem professor) as fichas ficam como estão: só o admin as gerencia.
    """
    if destino_professor_id is None or not aluno_ids:
        return []

    fichas = db.scalars(
        select(Ficha).where(
            Ficha.aluno_id.in_(aluno_ids), Ficha.ativo.is_(True), Ficha.professor_id != destino_professor_id)
    ).all()
    agora = agora_naive()
    for ficha in fichas:
        ficha.professor_id = destino_professor_id
        ficha.atualizado_em = agora

    return [ficha.id for ficha in fichas]


def registrar_alteracao(
    db: Session, ator: tuple, ficha: Ficha, acao: str, entidade: str, entidade_id: int,
    descricao: str, detalhes: dict | None = None,
) -> None:
    """Marca a ficha como atualizada e grava a auditoria na mesma transação (sem commit)."""
    ficha.atualizado_em = agora_naive()
    auditoria.registrar(
        db, usuario_do_ator(ator), acao, entidade, entidade_id, descricao,
        {"ficha_id": ficha.id, "ator": ator[0], **(detalhes or {})},
    )


def montar_ficha_completa(db: Session, ficha: Ficha) -> FichaCompletaResposta:
    """Ficha com treinos ativos e seus itens ativos (mesmo formato do aluno e das versões)."""
    treinos = db.scalars(
        select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True)).order_by(Treino.ordem)).all()

    # Uma consulta para os itens de todos os treinos, já com o exercício (evita N+1)
    itens_por_treino = {treino.id: [] for treino in treinos}
    itens_ativos = db.scalars(
        select(ItemFicha).options(joinedload(ItemFicha.exercicio)).where(
            ItemFicha.treino_id.in_(itens_por_treino), ItemFicha.ativo.is_(True)).order_by(ItemFicha.ordem)).all()
    for item in itens_ativos:
        itens_por_treino[item.treino_id].append(item)

    return FichaCompletaResposta(
        id=ficha.id,
        nome=ficha.nome,
        professor_nome=ficha.professor.nome if ficha.professor else None,
        data_criacao=ficha.data_criacao,
        aluno_id=ficha.aluno_id,
        status=ficha.status,
        objetivo=ficha.objetivo,
        atualizado_em=ficha.atualizado_em,
        treinos=[
            TreinoComItensResposta(
                id=treino.id,
                ficha_id=treino.ficha_id,
                nome=treino.nome,
                dia_semana=treino.dia_semana,
                ordem=treino.ordem,
                total_itens=len(itens_por_treino[treino.id]),
                itens=[montar_item_treino(item) for item in itens_por_treino[treino.id]],
            )
            for treino in treinos
        ],
        **dados_vigencia(ficha),
    )


def duplicar_ficha(db: Session, ator: tuple, origem: Ficha, aluno: Aluno, nome: str | None) -> Ficha:
    """Copia treinos e itens ativos para uma nova ficha rascunho; o professor da cópia é o da original."""
    momento = agora_naive()
    nova = Ficha(
        aluno_id=aluno.id,
        professor_id=origem.professor_id,
        nome=(nome or f"{origem.nome} (cópia)")[:150],
        objetivo=origem.objetivo,
        status="rascunho",
        data_criacao=momento,
        atualizado_em=momento,
        data_inicio=hoje(),
        ativo=True,
    )
    db.add(nova)
    db.flush()

    treinos = db.scalars(
        select(Treino).where(Treino.ficha_id == origem.id, Treino.ativo.is_(True)).order_by(Treino.ordem)).all()
    for treino in treinos:
        novo_treino = Treino(
            ficha_id=nova.id, nome=treino.nome, dia_semana=treino.dia_semana, ordem=treino.ordem, ativo=True)
        db.add(novo_treino)
        db.flush()

        itens = db.scalars(
            select(ItemFicha).join(Exercicio).where(
                ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True), Exercicio.ativo.is_(True)
            ).order_by(ItemFicha.ordem)).all()
        for item in itens:
            db.add(ItemFicha(
                ficha_id=nova.id, treino_id=novo_treino.id, exercicio_id=item.exercicio_id,
                series=item.series, repeticoes=item.repeticoes, carga=item.carga, descanso=item.descanso,
                ordem=item.ordem, observacao=item.observacao, ativo=True,
            ))

    auditoria.registrar(
        db, usuario_do_ator(ator), "ficha.duplicar", "ficha", nova.id,
        f"Ficha \"{origem.nome}\" duplicada como \"{nova.nome}\"",
        {"ficha_id": nova.id, "origem_id": origem.id, "ator": ator[0]},
    )
    return nova


def duplicar_item(db: Session, ator: tuple, item: ItemFicha, ficha: Ficha) -> ItemFicha:
    """Copia o item logo abaixo (ordem + 1), empurrando os seguintes uma posição."""
    seguintes = db.scalars(
        select(ItemFicha).where(
            ItemFicha.treino_id == item.treino_id, ItemFicha.ativo.is_(True), ItemFicha.ordem > item.ordem
        ).order_by(ItemFicha.ordem.desc())).all()
    # Do último para o primeiro, evitando colisão transitória de ordem
    for seguinte in seguintes:
        seguinte.ordem += 1
    db.flush()

    copia = ItemFicha(
        ficha_id=item.ficha_id, treino_id=item.treino_id, exercicio_id=item.exercicio_id,
        series=item.series, repeticoes=item.repeticoes, carga=item.carga, descanso=item.descanso,
        ordem=item.ordem + 1, observacao=item.observacao, ativo=True,
    )
    db.add(copia)
    db.flush()

    registrar_alteracao(
        db, ator, ficha, "item.duplicar", "item", copia.id,
        f"Item duplicado na ficha \"{ficha.nome}\"", {"origem_id": item.id, "treino_id": item.treino_id},
    )
    return copia


def _ids_repetidos(ids: list[int | None]) -> bool:
    informados = [i for i in ids if i is not None]
    return len(informados) != len(set(informados))


def aplicar_ficha_completa(db: Session, ator: tuple, ficha: Ficha, dados: AtualizarFichaCompleta) -> dict:
    """Aplica o estado completo da ficha (campos, treinos e itens) na sessão, SEM commit.

    Quem chama faz o commit (ou o rollback, se qualquer validação levantar HTTPException): é isso que torna
    o salvamento atômico. O que não vier no estado é removido com exclusão lógica (item sem histórico é
    apagado, como em DELETE /ficha/item/{id}). Devolve o resumo do que mudou, gravado na auditoria.
    """
    data_inicio = dados.data_inicio or data_inicio_efetiva(ficha)
    data_fim = dados.data_fim if "data_fim" in dados.model_fields_set else ficha.data_fim
    validar_periodo(data_inicio, data_fim)

    # Validações do payload inteiro antes de qualquer escrita
    if _ids_repetidos([t.id for t in dados.treinos]) or _ids_repetidos([i.id for t in dados.treinos for i in t.itens]):
        raise HTTPException(status_code=422, detail="Treino ou item repetido no estado da ficha")
    ordens_treino = [t.ordem for t in dados.treinos]
    if len(ordens_treino) != len(set(ordens_treino)):
        raise HTTPException(status_code=409, detail=MENSAGEM_ORDEM_TREINO)
    for treino_dados in dados.treinos:
        ordens_item = [i.ordem for i in treino_dados.itens]
        if len(ordens_item) != len(set(ordens_item)):
            raise HTTPException(status_code=409, detail=MENSAGEM_ORDEM_ITEM)

    exercicio_ids = {i.exercicio_id for t in dados.treinos for i in t.itens}
    if exercicio_ids:
        ativos = set(db.scalars(
            select(Exercicio.id).where(Exercicio.id.in_(exercicio_ids), Exercicio.ativo.is_(True))).all())
        if exercicio_ids - ativos:
            raise HTTPException(status_code=404, detail="Exercicio não encontrado")

    treinos_atuais = {t.id: t for t in db.scalars(
        select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True))).all()}
    itens_atuais: dict[int, list[ItemFicha]] = {tid: [] for tid in treinos_atuais}
    if treinos_atuais:
        for item in db.scalars(select(ItemFicha).where(
                ItemFicha.treino_id.in_(list(treinos_atuais)), ItemFicha.ativo.is_(True))).all():
            itens_atuais[item.treino_id].append(item)

    for treino_dados in dados.treinos:
        if treino_dados.id is not None and treino_dados.id not in treinos_atuais:
            raise HTTPException(status_code=404, detail="Treino não encontrado")
        proprios = {i.id for i in itens_atuais.get(treino_dados.id, [])}
        for item_dados in treino_dados.itens:
            if item_dados.id is not None and item_dados.id not in proprios:
                raise HTTPException(status_code=404, detail="Item da ficha não encontrado")

    resumo = {"treinos_criados": 0, "treinos_atualizados": 0, "treinos_removidos": 0,
              "itens_criados": 0, "itens_atualizados": 0, "itens_removidos": 0}

    campos = []
    if ficha.nome != dados.nome:
        campos.append("nome")
    if "objetivo" in dados.model_fields_set and ficha.objetivo != dados.objetivo:
        campos.append("objetivo")
    if data_inicio_efetiva(ficha) != data_inicio or ficha.data_fim != data_fim:
        campos.append("vigencia")
    ficha.nome = dados.nome
    ficha.data_inicio = data_inicio
    ficha.data_fim = data_fim
    if "objetivo" in dados.model_fields_set:
        ficha.objetivo = dados.objetivo

    # Remoções: treino que sumiu leva os itens junto (exclusão lógica); item que sumiu de treino mantido
    # é apagado se nunca foi executado e fica inativo se tem histórico
    mantidos = {t.id for t in dados.treinos if t.id is not None}
    for treino_id, treino in treinos_atuais.items():
        if treino_id not in mantidos:
            for item in itens_atuais[treino_id]:
                item.ativo = False
            treino.ativo = False
            resumo["treinos_removidos"] += 1
    for treino_dados in dados.treinos:
        if treino_dados.id is None:
            continue
        itens_mantidos = {i.id for i in treino_dados.itens if i.id is not None}
        for item in itens_atuais[treino_dados.id]:
            if item.id not in itens_mantidos:
                if item.historicos:
                    item.ativo = False
                else:
                    db.delete(item)
                resumo["itens_removidos"] += 1

    # Criações e atualizações
    for treino_dados in dados.treinos:
        if treino_dados.id is None:
            treino = Treino(ficha_id=ficha.id, nome=treino_dados.nome, dia_semana=treino_dados.dia_semana,
                            ordem=treino_dados.ordem, ativo=True)
            db.add(treino)
            db.flush()
            resumo["treinos_criados"] += 1
            existentes: dict[int, ItemFicha] = {}
        else:
            treino = treinos_atuais[treino_dados.id]
            if (treino.nome, treino.dia_semana, treino.ordem) != (
                    treino_dados.nome, treino_dados.dia_semana, treino_dados.ordem):
                resumo["treinos_atualizados"] += 1
            treino.nome = treino_dados.nome
            treino.dia_semana = treino_dados.dia_semana
            treino.ordem = treino_dados.ordem
            existentes = {i.id: i for i in itens_atuais[treino.id]}

        for item_dados in treino_dados.itens:
            novos = (item_dados.exercicio_id, item_dados.series, item_dados.repeticoes, item_dados.carga,
                     item_dados.descanso, item_dados.ordem, item_dados.observacao)
            if item_dados.id is None:
                db.add(ItemFicha(
                    ficha_id=ficha.id, treino_id=treino.id, exercicio_id=item_dados.exercicio_id,
                    series=item_dados.series, repeticoes=item_dados.repeticoes, carga=item_dados.carga,
                    descanso=item_dados.descanso, ordem=item_dados.ordem, observacao=item_dados.observacao,
                    ativo=True))
                resumo["itens_criados"] += 1
                continue
            item = existentes[item_dados.id]
            if (item.exercicio_id, item.series, item.repeticoes, item.carga, item.descanso, item.ordem,
                    item.observacao) != novos:
                resumo["itens_atualizados"] += 1
            (item.exercicio_id, item.series, item.repeticoes, item.carga, item.descanso, item.ordem,
             item.observacao) = novos

    db.flush()
    return {**resumo, "campos_alterados": campos}
