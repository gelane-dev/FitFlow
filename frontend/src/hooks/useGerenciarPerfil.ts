import axios from 'axios';
import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import {
  alterarEmail,
  alterarSenha,
  atualizarPerfilAluno,
  atualizarPerfilProfessor,
  enviarFotoPerfil,
  removerFotoPerfil,
} from '@/services/usuario.service';
import { ErroApi } from '@/types/api.types';
import { ArquivoUpload } from '@/types/usuario.types';

export function useGerenciarPerfil() {
  const { usuario, recarregarUsuario } = useAuth();

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(
    acao: () => Promise<void>,
    mensagemPadrao: string
  ): Promise<boolean> {
    try {
      setCarregando(true);
      setErro(null);

      await acao();

      return true;
    } catch (erro) {
      if (axios.isAxiosError<ErroApi>(erro)) {
        setErro(erro.response?.data?.detail || mensagemPadrao);
        return false;
      }

      setErro('Ocorreu um erro inesperado.');
      return false;
    } finally {
      setCarregando(false);
    }
  }

  function salvarDados(dados: {
    nome: string;
    telefone: string;
    dataNascimento: string;
  }) {
    return executar(async () => {
      if (usuario?.tipo === 'aluno') {
        await atualizarPerfilAluno({
          nome: dados.nome,
          telefone: dados.telefone,
          data_nascimento: dados.dataNascimento,
        });
      } else {
        await atualizarPerfilProfessor({
          nome: dados.nome,
          telefone: dados.telefone,
        });
      }
    }, 'Erro ao salvar perfil.');
  }

  function trocarEmail(email: string) {
    return executar(async () => {
      await alterarEmail({ email });
      await recarregarUsuario();
    }, 'Erro ao alterar e-mail.');
  }

  function trocarSenha(senhaAtual: string, novaSenha: string) {
    return executar(
      () => alterarSenha({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      'Erro ao alterar senha.'
    );
  }

  function trocarFoto(foto: ArquivoUpload) {
    return executar(async () => {
      await enviarFotoPerfil(foto);
      await recarregarUsuario();
    }, 'Erro ao enviar foto.');
  }

  function removerFoto() {
    return executar(async () => {
      await removerFotoPerfil();
      await recarregarUsuario();
    }, 'Erro ao remover foto.');
  }

  return {
    salvarDados,
    trocarEmail,
    trocarSenha,
    trocarFoto,
    removerFoto,
    carregando,
    erro,
  };
}
