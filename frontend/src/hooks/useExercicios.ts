import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { buscarExercicios } from '@/services/exercicio.service';
import { ErroApi } from '@/types/api.types';
import { Exercicio } from '@/types/exercicio.types';

export function useExercicios(paginaSolicitada: number) {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarExercicios = useCallback(async () => {
    {
      try {
        setCarregando(true);
        setErro(null);

        const dados = await buscarExercicios(paginaSolicitada);

        
        setExercicios(dados.itens);
        setPagina(dados.pagina);
        setLimite(dados.limite);
        setTotal(dados.total);
        setTotalPaginas(dados.total_paginas);
      } catch (erro) {
        if (axios.isAxiosError<ErroApi>(erro)) {
          setErro(
            erro.response?.data?.detail ||
              'Erro ao carregar exercícios.'
          );

          return;
        }

        setErro('Ocorreu um erro inesperado.');
      } finally {
        setCarregando(false);
      }
    }
  }, [paginaSolicitada]);

  useEffect(() => {
    carregarExercicios();
  }, [carregarExercicios]);

  return {
    exercicios,
    pagina,
    limite,
    total,
    totalPaginas,
    carregando,
    erro,
    recarregar: carregarExercicios,
  };
}