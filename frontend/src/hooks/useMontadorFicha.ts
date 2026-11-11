import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buscarFichaCompleta,
  criarFicha,
  publicarFicha,
  salvarFichaCompleta,
} from '@/services/ficha.service';
import { Exercicio } from '@/types/exercicio.types';
import { mensagemErro } from '@/utils/erroApi';
import {
  adicionarDivisao,
  adicionarItem,
  atualizarDivisao,
  atualizarItem,
  dadosDaFicha,
  duplicarDivisao,
  duplicarItem,
  ErrosMontador,
  FichaMontador,
  fichaDoServidor,
  fichaVazia,
  itemDoExercicio,
  moverDivisao,
  moverItem,
  payloadFichaCompleta,
  removerDivisao,
  removerItem,
  temAlteracoes,
  temErrosMontador,
  validarMontador,
} from '@/utils/montadorFicha';

export type ResultadoSalvar =
  | { ok: true; fichaId: number; versao?: number }
  | { ok: false; erro: string; invalido?: boolean };

interface Opcoes {
  /** `null`/`undefined` = ficha nova. */
  fichaId?: number | null;
  alunoIdInicial?: number | null;
}

const ERRO_SEM_ERROS: ErrosMontador = { divisoes: [] };

/**
 * Estado e ações do montador de fichas (professor, web). Tudo o que é digitado fica em memória;
 * a API só é chamada em `salvarRascunho` e `publicar`. O conteúdo vai numa única chamada transacional
 * (PUT /ficha/{id}/completa): se falhar, nada é gravado e a digitação é preservada. Ficha nova cria
 * primeiro o rascunho vazio (invisível ao aluno); o id guardado evita duplicá-lo numa nova tentativa.
 */
export function useMontadorFicha({ fichaId = null, alunoIdInicial = null }: Opcoes = {}) {
  const [ficha, setFicha] = useState<FichaMontador>(() => fichaVazia(alunoIdInicial));
  const [base, setBase] = useState<FichaMontador>(() => fichaVazia(alunoIdInicial));
  const [carregando, setCarregando] = useState(Boolean(fichaId));
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<ErrosMontador>(ERRO_SEM_ERROS);
  const [ultimaVersao, setUltimaVersao] = useState<number | null>(null);
  const ocupado = useRef(false);

  const carregar = useCallback(async () => {
    if (!fichaId) {
      return;
    }

    try {
      setCarregando(true);
      setErroCarga(null);

      const dados = fichaDoServidor(await buscarFichaCompleta(fichaId));

      setFicha(dados);
      setBase(dados);
    } catch (e) {
      setErroCarga(mensagemErro(e, 'Erro ao carregar a ficha.'));
    } finally {
      setCarregando(false);
    }
  }, [fichaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Ficha nova com `?alunoId=` de quem não é aluno vinculado: tira a seleção sem marcar a ficha como alterada. */
  const descartarAlunoInicial = useCallback((alunoId: number) => {
    setFicha((atual) => (atual.alunoId === alunoId ? { ...atual, alunoId: null } : atual));
    setBase((atual) => (atual.alunoId === alunoId ? { ...atual, alunoId: null } : atual));
  }, []);

  const alterado = useMemo(() => temAlteracoes(base, ficha), [base, ficha]);

  // ---------- Ações de edição (sempre sobre o estado local) ----------

  const editar = useCallback((mudar: (atual: FichaMontador) => FichaMontador) => {
    setFicha((atual) => mudar(atual));
  }, []);

  const acoes = useMemo(
    () => ({
      definirCampos: (
        campos: Partial<
          Pick<FichaMontador, 'alunoId' | 'nome' | 'objetivo' | 'dataInicio' | 'dataFim'>
        >
      ) => editar((f) => ({ ...f, ...campos })),
      adicionarDivisao: () => editar(adicionarDivisao),
      removerDivisao: (i: number) => editar((f) => removerDivisao(f, i)),
      duplicarDivisao: (i: number) => editar((f) => duplicarDivisao(f, i)),
      moverDivisao: (i: number, d: -1 | 1) => editar((f) => moverDivisao(f, i, d)),
      atualizarDivisao: (
        i: number,
        mudancas: Parameters<typeof atualizarDivisao>[2]
      ) => editar((f) => atualizarDivisao(f, i, mudancas)),
      adicionarExercicio: (i: number, exercicio: Exercicio) =>
        editar((f) => adicionarItem(f, i, itemDoExercicio(exercicio))),
      atualizarItem: (
        i: number,
        j: number,
        mudancas: Parameters<typeof atualizarItem>[3]
      ) => editar((f) => atualizarItem(f, i, j, mudancas)),
      removerItem: (i: number, j: number) => editar((f) => removerItem(f, i, j)),
      duplicarItem: (i: number, j: number) => editar((f) => duplicarItem(f, i, j)),
      moverItem: (i: number, j: number, d: -1 | 1) => editar((f) => moverItem(f, i, j, d)),
    }),
    [editar]
  );

  // ---------- Salvar ----------

  /** Cria o rascunho (ficha nova) e grava o conteúdo todo numa só chamada. Em falha, devolve o id já criado. */
  async function sincronizar(
    trabalho: FichaMontador
  ): Promise<{ ficha: FichaMontador; servidor: FichaMontador | null; erro: unknown | null }> {
    let atual: FichaMontador = trabalho;

    try {
      if (!atual.id) {
        const criada = await criarFicha({
          aluno_id: atual.alunoId as number,
          status: 'rascunho',
          ...dadosDaFicha(atual),
        });

        atual = { ...atual, id: criada.id, status: 'rascunho' };
      }

      const salva = await salvarFichaCompleta(atual.id as number, payloadFichaCompleta(atual));

      return { ficha: atual, servidor: fichaDoServidor(salva), erro: null };
    } catch (e) {
      return { ficha: atual, servidor: null, erro: e };
    }
  }

  /** Relê o servidor e adota o resultado como base (e como estado, se `adotar`). */
  async function recarregarBase(id: number, adotar: boolean): Promise<FichaMontador | null> {
    try {
      const dados = fichaDoServidor(await buscarFichaCompleta(id));

      setBase(dados);

      if (adotar) {
        setFicha(dados);
      }

      return dados;
    } catch {
      return null;
    }
  }

  async function executarSalvar(publicar: boolean): Promise<ResultadoSalvar> {
    if (ocupado.current) {
      return { ok: false, erro: 'Aguarde o salvamento em andamento.' };
    }

    const encontrados = validarMontador(ficha, { exigirExercicios: publicar });

    setErros(encontrados);

    if (temErrosMontador(encontrados)) {
      return { ok: false, erro: 'Corrija os campos destacados.', invalido: true };
    }

    ocupado.current = true;
    setSalvando(true);

    try {
      const resultado = await sincronizar(ficha);

      if (resultado.erro || !resultado.servidor) {
        // Nada foi gravado no conteúdo: mantém a digitação (e o id do rascunho recém-criado, se houver).
        setFicha(resultado.ficha);

        return { ok: false, erro: mensagemErro(resultado.erro, 'Erro ao salvar a ficha.') };
      }

      const id = resultado.ficha.id as number;
      let servidor = resultado.servidor;
      let versao: number | undefined;

      if (publicar) {
        try {
          const publicada = await publicarFicha(id);

          versao = publicada.numero;
          setUltimaVersao(publicada.numero);
        } catch (e) {
          // O conteúdo já foi salvo: adota o estado do servidor, sem perder o aviso
          setFicha(servidor);
          setBase(servidor);

          return {
            ok: false,
            erro: `Ficha salva, mas não foi possível publicar: ${mensagemErro(e, 'erro ao publicar.')}`,
          };
        }

        // Publicar muda o status: relê a ficha (se falhar, fica o estado salvo)
        servidor = (await recarregarBase(id, false)) ?? servidor;
      }

      setFicha(servidor);
      setBase(servidor);

      return { ok: true, fichaId: id, versao };
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

  return {
    ficha,
    carregando,
    erroCarga,
    recarregar: carregar,
    salvando,
    alterado,
    erros,
    ultimaVersao,
    descartarAlunoInicial,
    ...acoes,
    salvarRascunho: () => executarSalvar(false),
    publicar: () => executarSalvar(true),
  };
}
