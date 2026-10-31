from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from ..core.tempo import agora

from ..database import get_db
from ..core.seguranca import verificar_professor, verificar_aluno
from ..schemas.ficha import FichaCriar, FichaListaResposta, ItemFichaCriar, AtualizarFicha, FichaResposta, ItemFichaResposta, AtualizarItemFicha, FichaCompletaResposta, TreinoComItensResposta
from ..schemas.treino import ItemTreinoDiaResposta
from ..services.respostas import montar_item_treino
from ..services.fichas import hoje, data_inicio_efetiva, dados_vigencia, validar_periodo, contar_treinos_por_ficha
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
        **dados_vigencia(ficha, dia),
    )

def _montar_ficha_resposta(ficha: Ficha, dia=None) -> FichaResposta:
    return FichaResposta(
        id=ficha.id,
        nome=ficha.nome,
        professor_nome=ficha.professor.nome if ficha.professor else None,
        data_criacao=ficha.data_criacao,
        itens=[ItemFichaResposta.model_validate(item, from_attributes=True) for item in ficha.itens],
        **dados_vigencia(ficha, dia),
    )

@router.post("/ficha", response_model=FichaListaResposta)
def criar_ficha(criar: FichaCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    aluno = db.scalar(
        select(Aluno).where(Aluno.id == criar.aluno_id))

    if not aluno:
        raise HTTPException(
            status_code=404,
            detail="Aluno não encontrado"
        )

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
        ativo=True
    )
        
    db.add(ficha) 
    db.commit()
    db.refresh(ficha)

    return _montar_ficha_lista(ficha, total_treinos=contar_treinos_por_ficha(db, [ficha.id]).get(ficha.id, 0))

@router.get("/ficha", response_model=list[FichaListaResposta])
def listar_fichas_professor(aluno_id: int | None = None, professor=Depends(verificar_professor), db: Session = Depends(get_db)):
    consulta = select(Ficha).options(joinedload(Ficha.aluno)).where(
        Ficha.professor_id == professor.id,
        Ficha.ativo.is_(True),
    )

    if aluno_id is not None:
        consulta = consulta.where(Ficha.aluno_id == aluno_id)

    fichas = db.scalars(consulta.order_by(Ficha.data_criacao.desc())).all()
    dia = hoje()
    totais = contar_treinos_por_ficha(db, [ficha.id for ficha in fichas])

    return [_montar_ficha_lista(ficha, dia, totais.get(ficha.id, 0)) for ficha in fichas]

@router.post("/ficha/itens", response_model=ItemTreinoDiaResposta)
def criar_itens_ficha(criar: ItemFichaCriar, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id  == criar.ficha_id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não é o professor responsável por esta ficha"
        )
    
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
        ativo=True
    )
        
    db.add(item)
    db.commit()
    db.refresh(item)

    return montar_item_treino(item, exercicio)

@router.get("/ficha/aluno", response_model=list[FichaResposta])
def fichas(aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    fichas = db.scalars(
        select(Ficha).options(selectinload(Ficha.itens), joinedload(Ficha.professor)).where(Ficha.aluno_id == aluno.id, Ficha.ativo.is_(True))
        .order_by(Ficha.data_criacao.desc(), Ficha.id.desc())).all()

    dia = hoje()
    respostas = [_montar_ficha_resposta(ficha, dia) for ficha in fichas]

    # Vigentes primeiro; a ordem por data_criacao desc é preservada (sort estável)
    return sorted(respostas, key=lambda ficha: not ficha.vigente)

@router.get("/ficha/{id:int}", response_model=FichaCompletaResposta)
def ficha_aluno(id: int, aluno=Depends(verificar_aluno), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).options(joinedload(Ficha.professor)).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    if ficha.aluno_id != aluno.id:
         raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    treinos = db.scalars(
        select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True)).order_by(Treino.ordem)).all()

    # Uma consulta para os itens de todos os treinos, já com o exercício (evita N+1)
    itens_por_treino = {treino.id: [] for treino in treinos}
    itens_ativos = db.scalars(
        select(ItemFicha).options(joinedload(ItemFicha.exercicio)).where(
            ItemFicha.treino_id.in_(itens_por_treino), ItemFicha.ativo.is_(True)).order_by(ItemFicha.ordem)).all()
    for item in itens_ativos:
        itens_por_treino[item.treino_id].append(item)

    treinos_resposta = []

    for treino in treinos:
        itens = itens_por_treino[treino.id]

        treinos_resposta.append(TreinoComItensResposta(
            id=treino.id,
            ficha_id=treino.ficha_id,
            nome=treino.nome,
            dia_semana=treino.dia_semana,
            ordem=treino.ordem,
            total_itens=len(itens),
            itens=[montar_item_treino(item) for item in itens],
        ))

    return FichaCompletaResposta(
        id=ficha.id,
        nome=ficha.nome,
        professor_nome=ficha.professor.nome if ficha.professor else None,
        data_criacao=ficha.data_criacao,
        treinos=treinos_resposta,
        **dados_vigencia(ficha),
    )

@router.put("/ficha/{id:int}", response_model=FichaResposta)
def atualizar_ficha(id: int, dados: AtualizarFicha, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha de treino não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para alterar esta ficha de treino"
        )

    data_inicio = dados.data_inicio or data_inicio_efetiva(ficha)
    data_fim = dados.data_fim if "data_fim" in dados.model_fields_set else ficha.data_fim
    validar_periodo(data_inicio, data_fim)

    ficha.nome = dados.nome
    ficha.data_inicio = data_inicio
    ficha.data_fim = data_fim

    db.commit()
    db.refresh(ficha)

    return _montar_ficha_resposta(ficha)

@router.put("/ficha/item/{id}", response_model=ItemFichaResposta)
def atualizar_itens_ficha(id: int, dados: AtualizarItemFicha, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    item_ficha = db.scalar(
        select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == item_ficha.ficha_id, Ficha.ativo.is_(True)))
    
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para alterar esta ficha de treino"
        )

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

    db.commit()
    db.refresh(item_ficha)

    return item_ficha

@router.delete("/ficha/item/{id}")
def deletar_item_ficha(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    item_ficha = db.scalar(
        select(ItemFicha).where(ItemFicha.id == id, ItemFicha.ativo.is_(True)))

    if not item_ficha:
        raise HTTPException(
            status_code=404,
            detail="Item da ficha não encontrado"
        )
    
    ficha = db.scalar(
        select(Ficha).where(Ficha.id == item_ficha.ficha_id))
    
    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )   

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para excluir este item"
        )

    if item_ficha.historicos:
        item_ficha.ativo = False
    else:
        db.delete(item_ficha)
    
    db.commit()

    return {
        "mensagem": "Item da ficha excluído com sucesso"
    }

@router.delete("/ficha/{id:int}")
def deletar_ficha(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para excluir esta ficha"
        )
    
    treinos = db.scalars(
    select(Treino).where(Treino.ficha_id == ficha.id, Treino.ativo.is_(True))).all()

    for treino in treinos:
        itens = db.scalars(
        select(ItemFicha).where(ItemFicha.treino_id == treino.id, ItemFicha.ativo.is_(True))).all()

        for item in itens:
            item.ativo = False
        
        treino.ativo = False
    ficha.ativo = False
    db.commit()

    return {
        "mensagem": "Ficha excluída com sucesso"
    }

@router.get("/ficha/itens/treino/{treino_id}", response_model=list[ItemTreinoDiaResposta])
def listar_exercicios(treino_id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):

    treino = db.scalar(
        select(Treino).where(Treino.id == treino_id, Treino.ativo.is_(True)))
    
    if not treino:
        raise HTTPException(
            status_code=404,
            detail="Treino não encontrado"
        )

    ficha = db.scalar(
        select(Ficha).where(Ficha.id == treino.ficha_id, Ficha.ativo.is_(True)))
    
    if not ficha:
         raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )
    
    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para visualizar este treino"
        )

    itens = db.scalars(
        select(ItemFicha).join(Exercicio).where(
            ItemFicha.treino_id == treino_id,
            ItemFicha.ativo.is_(True),
            Exercicio.ativo.is_(True),
        ).order_by(ItemFicha.ordem)
    ).all()

    return [montar_item_treino(item) for item in itens]

@router.get("/ficha/professor/{id}", response_model=FichaListaResposta)
def ficha_professor(id: int, professor=Depends(verificar_professor), db: Session = Depends(get_db)):
    ficha = db.scalar(
        select(Ficha).where(Ficha.id == id, Ficha.ativo.is_(True)))

    if not ficha:
        raise HTTPException(
            status_code=404,
            detail="Ficha não encontrada"
        )

    if ficha.professor_id != professor.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para visualizar esta ficha"
        )

    return _montar_ficha_lista(ficha, total_treinos=contar_treinos_por_ficha(db, [ficha.id]).get(ficha.id, 0))