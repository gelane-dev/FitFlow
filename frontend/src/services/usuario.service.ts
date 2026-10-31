import { api } from './api';
import { TIMEOUT_LOGIN_MS } from './auth.service';
import {
  AlterarEmailRequest,
  AlterarSenhaRequest,
  ArquivoUpload,
  PerfilAluno,
  PerfilAlunoAtualizar,
  PerfilProfessor,
  PerfilProfessorAtualizar,
  Usuario,
} from '@/types/usuario.types';

export async function buscarUsuario(): Promise<Usuario> {
  const resposta = await api.get<Usuario>('/perfil', {
    timeout: TIMEOUT_LOGIN_MS,
  });

  return resposta.data;
}

export async function buscarPerfilAluno(): Promise<PerfilAluno> {
  const resposta = await api.get<PerfilAluno>('/perfil/aluno');

  return resposta.data;
}

export async function atualizarPerfilAluno(
  dados: PerfilAlunoAtualizar
): Promise<void> {
  await api.put('/perfil/aluno', dados);
}

export async function buscarPerfilProfessor(): Promise<PerfilProfessor> {
  const resposta = await api.get<PerfilProfessor>('/perfil/professor');

  return resposta.data;
}

export async function atualizarPerfilProfessor(
  dados: PerfilProfessorAtualizar
): Promise<void> {
  await api.put('/perfil/professor', dados);
}

export async function alterarEmail(
  dados: AlterarEmailRequest
): Promise<void> {
  await api.put('/perfil/email', dados);
}

export async function alterarSenha(
  dados: AlterarSenhaRequest
): Promise<void> {
  await api.put('/perfil/senha', dados);
}

export async function enviarFotoPerfil(
  foto: ArquivoUpload
): Promise<void> {
  const formulario = new FormData();

  formulario.append('arquivo', foto as unknown as Blob);

  await api.put('/perfil/foto', formulario, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function removerFotoPerfil(): Promise<void> {
  await api.delete('/perfil/foto');
}
