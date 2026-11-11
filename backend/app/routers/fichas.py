from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from ..core.tempo import agora

from ..database import get_db
from ..core.seguranca import verificar_professor, verificar_aluno
from ..schemas.ficha import FichaCriar, FichaListaResposta, ItemFichaCriar, AtualizarFicha, FichaResposta, ItemFichaResposta, AtualizarItemFicha, FichaCompletaResposta, DuplicarFicha, StatusFicha, AtualizarFichaCompleta
from ..schemas.treino import ItemTreinoDiaResposta
from ..schemas.professor_web import FichaVersaoResumo, FichaVersaoResposta
from ..services.respostas import montar_item_treino
from ..services.acesso_aluno import obter_aluno_acessivel
from ..services.fichas import (
    ator_professor_ou_admin, hoje, data_inicio_efetiva, dados_vigencia, validar_periodo, contar_treinos_por_ficha,
    obter_ficha_gerenciavel, registrar_alteracao, montar_ficha_completa, duplicar_ficha, duplicar_item, aplicar_ficha_completa,
)
from ..services import auditoria, versoes_ficha
from ..models import Aluno, Ficha, ItemFicha, Exercicio, Treino

router = APIRouter()

def _montar_ficha_lista(ficha: Ficha, dia=None, total_treinos: int = 0) -> FichaListaResposta:
    return FichaListaResposta(
        id=ficha.id,
        nome=ficha.nome,
        data_criacao=ficha.data_criacao,
        aluno_id=ficha.aluno_id,
        aluno_nome=ficha.aluno.nome,
        total_treinos=total_treinos,
        status=ficha.status,
        objetivo=ficha.objetivo,
        atualizado_em=ficha.atualizado_em,
        professor_id=ficha.professor_id,
        professor_nome=ficha.professor.nome if ficha.professor else None,
        **dados_vigencia(ficha, dia),
    )

def _montar_ficha_resposta(ficha: Ficha, dia=None) -> FichaResposta:
    return FichaResposta(
        id=ficha.id,
        nome=ficha.nome,
        professor_nome=ficha.professor.nome if ficha.professor else None,
        data_criacao=ficha.data_criacao,
        status=ficha.status,
        objetivo=ficha.objetivo,
        itens=[ItemFichaResposta.model_validate(item, from_attributes=True) for item in ficha.itens],
        **dados_vigencia(ficha, dia),
    )

@router.post("/ficha", response_model=FichaListaResposta)
def criar_ficha(criar: FichaCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = obter_aluno_acessivel(db, ("professor", professor), criar.aluno_id)

    data_inicio = criar.data_inicio or hoje()
    validar_periodo(data_inicio, criar.data_fim)

    ficha = Ficha(
        aluno_id = aluno.id,
        professor_id = professor.id,
        nome = criar.nome,
        # Coluna DateTime é naive: grava o horário local do fuso da aplicação sem tzinfo
        data_criacao = agora().replace(tzinfo=None),
        data_inicio = data_inicio,
        data_fim = criar.data_fim,
        objetivo = criar.objetivo,
        status = criar.status,
        ativo=True
    )
    ficha.atualizado_em = ficha.data_criacao

    db.add(ficha)
    db.flush()

    ator = ("professor", professor)
    auditoria.registrar(
        db, professor.user, "ficha.criar", "ficha", ficha.id, f"Ficha \"{ficha.nome}\" criada",
        {"ficha_id": ficha.id, "aluno_id": aluno.id, "status": ficha.status, "ator": "professor"})
    if ficha.status == "publicada":
        versoes_ficha.publicar(db, ator, ficha)
    db.commit()
    db.refresh(ficha)

    return _montar_ficha_lista(ficha, total_treinos=contar_treinos_por_ficha(db, [ficha.id]).get(ficha.id, 0))

@router.get("/ficha", response_model=list[FichaListaResposta])
def listar_fichas_professor(aluno_id: int | None = None, status: StatusFicha | None = None, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):
    consulta = select(Ficha).options(joinedload(Ficha.aluno), joinedload(Ficha.professor)).where(Ficha.ativo.is_(True))

    # Professor vê as próprias fichas; admin vê todas
    if ator[0] == "professor":
        consulta = consulta.where(Ficha.professor_id == ator[1].id)

    if status is not None:
        consulta = consulta.where(Ficha.status == status)

    if aluno_id is not None:
        consulta = consulta.where(Ficha.aluno_id == aluno_id)

    fichas = db.scalars(consulta.order_by(Ficha.data_criacao.desc())).all()
    dia = hoje()
    totais = contar_treinos_por_ficha(db, [ficha.id for ficha in fichas])

    return [_montar_ficha_lista(ficha, dia, totais.get(ficha.id, 0)) for ficha in fichas]

@router.post("/ficha/itens", response_model=ItemTreinoDiaResposta)
def criar_itens_ficha(criar: ItemFichaCriar, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, criar.ficha_id, "Você não é o professor responsável por esta ficha")
    
    exercicio = db.scalar(select(Exercicio).where(Exercicio.id == criar.exercicio_id, Exercicio.ativo.is_(True)))
    
    if not exercicio:
        raise HTTPException(
            status_code=404,
            detail="Exercicio não encontrado"
        )

    treino = db.scalar(select(Treino).where(Treino.id == criar.treino_id, Treino.ativo.is_(True)))
        
    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )

    if criar.ficha_id != treino.ficha_id:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )
    
    itemficha = db.scalar(select(ItemFicha).where(ItemFicha.treino_id == criar.treino_id, ItemFicha.exercicio_id == criar.exercicio_id, ItemFicha.ativo.is_(True)))
        
    if itemficha:
        raise HTTPException(
            status_code=409,
            detail="Exercício já cadastrado neste treino"
        )

    verificar_ordem = db.scalar(
        select(ItemFicha).where(ItemFicha.treino_id == criar.treino_id, ItemFicha.ativo.is_(True), ItemFicha.ordem == criar.ordem))
    
    if verificar_ordem:
        raise HTTPException(
            status_code=409,
            detail="Já existe um exercício com esta ordem neste treino"
        )
    
    item = ItemFicha(
        ficha_id = ficha.id,
        treino_id = treino.id,
        exercicio_id = criar.exercicio_id,
        series = criar.series,
        repeticoes = criar.repeticoes,
        carga = criar.carga,
        descanso = criar.descanso,
        ordem = criar.ordem,
        observacao = criar.observacao,
        ativo=True
    )

    db.add(item)
    db.flush()
    registrar_alteracao(db, ator, ficha, "item.criar", "item", item.id, f"Item \"{exercicio.nome}\" adicionado à ficha \"{ficha.nome}\"",
                        {"treino_id": treino.id, "exercicio_id": exercicio.id})
    db.commit()
    db.refresh(item)

    return montar_item_treino(item, exercicio)

@router.get("/ficha/aluno", response_model=list[FichaResposta])
def fichas(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    fichas = db.scalars(
        select(Ficha).options(selectinload(Ficha.itens), joinedload(Ficha.professor)).where(Ficha.aluno_id == aluno.id, Ficha.ativo.is_(True), Ficha.status == "publicada")
        .order_by(Ficha.data_criacao.desc(), Ficha.id.desc())).all()

    dia = hoje()
    respostas = [_montar_ficha_resposta(ficha, dia) for ficha in fichas]

    # Vigentes primeiro; a ordem por data_criacao desc é preservada (sort estável)
    return sorted(respostas, key=lambda ficha: not ficha.vigente)

@router.get("/ficha/{id:int}", response_model=FichaCompletaResposta)
def ficha_aluno(id: int, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    # Rascunho é invisível ao aluno: mesmo 404 de ficha inexistente
    ficha = db.scalar(
        select(Ficha).options(joinedload(Ficha.professor)).where(
            Ficha.id == id, Ficha.ativo.is_(True), Ficha.status == "publicada", Ficha.aluno_id == aluno.id))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    return montar_ficha_completa(db, ficha)

@router.put("/ficha/{id:int}", response_model=FichaResposta)
def atualizar_ficha(id: int, dados: AtualizarFicha, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para alterar esta ficha de treino")

    data_inicio = dados.data_inicio or data_inicio_efetiva(ficha)
    data_fim = dados.data_fim if "data_fim" in dados.model_fields_set else ficha.data_fim
    validar_periodo(data_inicio, data_fim)

    ficha.nome = dados.nome
    ficha.data_inicio = data_inicio
    ficha.data_fim = data_fim
    if "objetivo" in dados.model_fields_set:
        ficha.objetivo = dados.objetivo

    registrar_alteracao(db, ator, ficha, "ficha.editar", "ficha", ficha.id, f"Ficha \"{ficha.nome}\" editada")
    db.commit()
    db.refresh(ficha)

    return _montar_ficha_resposta(ficha)

@router.put("/ficha/item/{id}", response_model=ItemFichaResposta)
def atualizar_itens_ficha(id: int, dados: AtualizarItemFicha, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    item_ficha = db.scalar(
        select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )

    ficha = obter_ficha_gerenciavel(db, ator, item_ficha.ficha_id, "Você não tem permissão para alterar esta ficha de treino")

    verificar_ordem = db.scalar(
        select(ItemFicha).where(ItemFicha.treino_id == item_ficha.treino_id, ItemFicha.ativo.is_(True), ItemFicha.ordem == dados.ordem, ItemFicha.id != id))

    if verificar_ordem:
        raise HTTPException(
            status_code=409,
            detail="Já existe um exercício com esta ordem neste treino"
        )

    item_ficha.series = dados.series
    item_ficha.repeticoes = dados.repeticoes
    item_ficha.carga = dados.carga
    item_ficha.descanso = dados.descanso
    item_ficha.ordem = dados.ordem
    if "observacao" in dados.model_fields_set:
        item_ficha.observacao = dados.observacao

    registrar_alteracao(db, ator, ficha, "item.editar", "item", item_ficha.id, f"Item editado na ficha \"{ficha.nome}\"")
    db.commit()
    db.refresh(item_ficha)

    return item_ficha

@router.post("/ficha/item/{id:int}/duplicar", response_model=ItemTreinoDiaResposta)
def duplicar_item_ficha(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    item = db.scalar(select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )

    ficha = obter_ficha_gerenciavel(db, ator, item.ficha_id, "Você não tem permissão para alterar esta ficha de treino")
    copia = duplicar_item(db, ator, item, ficha)
    db.commit()
    db.refresh(copia)

    return montar_item_treino(copia)

@router.delete("/ficha/item/{id}")
def deletar_item_ficha(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    item_ficha = db.scalar(
        select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )

    ficha = obter_ficha_gerenciavel(db, ator, item_ficha.ficha_id, "Você não tem permissão para excluir este item", somente_ativa=False)

    registrar_alteracao(db, ator, ficha, "item.excluir", "item", item_ficha.id, f"Item excluído da ficha \"{ficha.nome}\"",
                        {"exercicio_id": item_ficha.exercicio_id})

    if item_ficha.historicos:
        item_ficha.ativo = False
    else:
        db.delete(item_ficha)

    db.commit()

    return {
        "mensagem": "Item da ficha excluído com sucesso"
    }

@router.delete("/ficha/{id:int}")
def deletar_ficha(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para excluir esta ficha")

    treinos = db.scalars(
    select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True))).all()

    for treino in treinos:
        itens = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True))).all()

        for item in itens:
            item.ativo = False

        treino.ativo = False
    ficha.ativo = False
    registrar_alteracao(db, ator, ficha, "ficha.excluir", "ficha", ficha.id, f"Ficha \"{ficha.nome}\" excluída")
    db.commit()

    return {
        "mensagem": "Ficha excluída com sucesso"
    }

@router.get("/ficha/itens/treino/{treino_id}", response_model=list[ItemTreinoDiaResposta])
def listar_exercicios(treino_id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    treino = db.scalar(
        select(Treino).where(Treino.id == treino_id, Treino.ativo.is_(True)))

    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )

    obter_ficha_gerenciavel(db, ator, treino.ficha_id, "Você não tem permissão para visualizar este treino")

    itens = db.scalars(
        select(ItemFicha).join(Exercicio).where(
            ItemFicha.treino_id == treino_id,
            ItemFicha.ativo.is_(True),
            Exercicio.ativo.is_(True),
        ).order_by(ItemFicha.ordem)
    ).all()

    return [montar_item_treino(item) for item in itens]

@router.get("/ficha/professor/{id}", response_model=FichaListaResposta)
def ficha_professor(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para visualizar esta ficha")

    return _montar_ficha_lista(ficha, total_treinos=contar_treinos_por_ficha(db, [ficha.id]).get(ficha.id, 0))

@router.get("/ficha/{id:int}/completa", response_model=FichaCompletaResposta)
def ficha_completa(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para visualizar esta ficha")

    return montar_ficha_completa(db, ficha)

@router.put("/ficha/{id:int}/completa", response_model=FichaCompletaResposta)
def atualizar_ficha_completa(id: int, dados: AtualizarFichaCompleta, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para alterar esta ficha de treino")

    # Tudo ou nada: qualquer falha desfaz a transação inteira (a ficha nunca fica pela metade)
    try:
        resumo = aplicar_ficha_completa(db, ator, ficha, dados)
        registrar_alteracao(db, ator, ficha, "ficha.editar", "ficha", ficha.id, f"Ficha \"{ficha.nome}\" editada",
                            {"completa": True, **resumo})
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(ficha)

    return montar_ficha_completa(db, ficha)

@router.post("/ficha/{id:int}/publicar", response_model=FichaVersaoResumo)
def publicar_ficha(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para publicar esta ficha")
    versao = versoes_ficha.publicar(db, ator, ficha)
    db.commit()

    return versoes_ficha.montar_resumo(db, versao)

@router.get("/ficha/{id:int}/versoes", response_model=list[FichaVersaoResumo])
def listar_versoes(id: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para visualizar esta ficha")

    return versoes_ficha.listar(db, ficha)

@router.get("/ficha/{id:int}/versoes/{numero:int}", response_model=FichaVersaoResposta)
def obter_versao(id: int, numero: int, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    ficha = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para visualizar esta ficha")

    return versoes_ficha.obter(db, ficha, numero)

@router.post("/ficha/{id:int}/duplicar", response_model=FichaListaResposta)
def duplicar_ficha_rota(id: int, dados: DuplicarFicha | None = None, ator=Depends(ator_professor_ou_admin), db: Session = Depends(get_db)):

    dados = dados or DuplicarFicha()
    origem = obter_ficha_gerenciavel(db, ator, id, "Você não tem permissão para duplicar esta ficha")
    aluno = obter_aluno_acessivel(db, ator, dados.aluno_id or origem.aluno_id)

    nova = duplicar_ficha(db, ator, origem, aluno, dados.nome)
    db.commit()
    db.refresh(nova)

    return _montar_ficha_lista(nova, total_treinos=contar_treinos_por_ficha(db, [nova.id]).get(nova.id, 0))
