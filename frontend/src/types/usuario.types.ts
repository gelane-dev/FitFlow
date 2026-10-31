export type TipoUsuario = 'aluno' | 'professor' | 'admin';

export interface Usuario {
  id: number;
  email: string;
  tipo: TipoUsuario;
  foto: string | null;
}

export interface PerfilAluno {
  id: number;
  nome: string;
  telefone: string;
  data_nascimento: string;
}

export interface PerfilAlunoAtualizar {
  nome: string;
  telefone: string;
  data_nascimento: string;
}

export interface PerfilProfessor {
  id: number;
  nome: string;
  telefone: string;
}

export interface PerfilProfessorAtualizar {
  nome: string;
  telefone: string;
}

export interface AlterarEmailRequest {
  email: string;
}

export interface AlterarSenhaRequest {
  senha_atual: string;
  nova_senha: string;
}

export interface ArquivoUpload {
  uri: string;
  name: string;
  type: string;
}
