import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import {
  buscarPerfilAluno,
  buscarPerfilProfessor,
} from '@/services/usuario.service';
import { ErroApi } from '@/types/api.types';
import { formatarData } from '@/utils/datas';

/** Carrega os dados do perfil (nome, telefone, nascimento) conforme o tipo do usuário. */
export function usePerfil() {
  const { usuario } = useAuth();
  const tipo = usuario?.tipo;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (tipo !== 'aluno' && tipo !== 'professor') {
      return;
    }

    try {
      setCarregando(true);
      setErro(null);

      if (tipo === 'aluno') {
        const perfil = await buscarPerfilAluno();
        setNome(perfil.nome);
        setTelefone(perfil.telefone);
        setDataNascimento(formatarData(perfil.data_nascimento));
      } else {
        const perfil = await buscarPerfilProfessor();
        setNome(perfil.nome);
        setTelefone(perfil.telefone);
      }
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(erro.response?.data?.detail || 'Erro ao carregar perfil.');
        return;
      }

      setErro('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }, [tipo]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    nome,
    telefone,
    dataNascimento,
    setNome,
    setTelefone,
    setDataNascimento,
    carregando,
    erro,
    recarregar,
  };
}
