/** Tipos da API de gestão da academia (docs/contracts/Contrato-Gestao.md). */

/** Dinheiro trafega como string decimal ("99.90"); use `utils/moeda` para exibir. */
export type Dinheiro = string;

export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  por_pagina: number;
}

export interface ParametrosPagina {
  pagina?: number;
  por_pagina?: number;
}

/** Data ISO `YYYY-MM-DD`. */
export type DataIso = string;
/** Data e hora ISO 8601. */
export type DataHoraIso = string;

export type StatusCadastro = 'pendente' | 'aprovado' | 'recusado';
export type SituacaoMatricula =
  | 'vigente'
  | 'vencendo'
  | 'vencida'
  | 'sem_matricula';
/** Filtro de situação da lista de alunos. */
export type SituacaoAluno =
  | SituacaoMatricula
  | 'pendente'
  | 'desativado'
  | 'inadimplente';
export type StatusMatricula =
  | 'ativa'
  | 'encerrada'
  | 'substituida'
  | 'cancelada';
export type StatusPagamento =
  | 'pendente'
  | 'pago'
  | 'estornado'
  | 'cancelado';
export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'
  | 'outro';
export type Periodicidade =
  | 'mensal'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'avulso';
export type ResultadoAcesso = 'liberado' | 'bloqueado';
export type OrigemAcesso = 'manual' | 'qrcode' | 'codigo_barras';
export type MotivoBloqueio =
  | 'conta_desativada'
  | 'cadastro_pendente'
  | 'restricao'
  | 'sem_matricula'
  | 'matricula_vencida'
  | 'pagamento_pendente';

export type PermissaoRecepcao =
  | 'cadastrar_aluno'
  | 'editar_aluno'
  | 'aprovar_aluno'
  | 'matricular'
  | 'renovar_matricula'
  | 'alterar_plano'
  | 'cancelar_matricula'
  | 'registrar_pagamento'
  | 'estornar_pagamento'
  | 'registrar_acesso'
  | 'liberar_acesso_manual';

export const PERMISSOES_RECEPCAO: PermissaoRecepcao[] = [
  'cadastrar_aluno',
  'editar_aluno',
  'aprovar_aluno',
  'matricular',
  'renovar_matricula',
  'alterar_plano',
  'cancelar_matricula',
  'registrar_pagamento',
  'estornar_pagamento',
  'registrar_acesso',
  'liberar_acesso_manual',
];

export interface RefNome {
  id: number;
  nome: string;
}

/* ---------------------------- Gestão de alunos ---------------------------- */

export interface FiltrosGestaoAlunos extends ParametrosPagina {
  busca?: string;
  situacao?: SituacaoAluno;
  /** `0` = alunos sem professor. */
  professor_id?: number;
  plano_id?: number;
}

export interface GestaoAlunoItem {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  foto: string | null;
  ativo: boolean;
  status_cadastro: StatusCadastro;
  professor: RefNome | null;
  plano_atual: RefNome | null;
  data_vencimento: DataIso | null;
  situacao: SituacaoMatricula;
  inadimplente: boolean;
  criado_em: DataHoraIso | null;
}

export interface GestaoAlunoDetalhe extends GestaoAlunoItem {
  cpf: string | null;
  endereco: string | null;
  observacoes: string | null;
  data_nascimento: DataIso;
  restricao_acesso: string | null;
  codigo_acesso: string;
  matricula_atual: MatriculaResposta | null;
  aprovado_em: DataHoraIso | null;
}

export interface GestaoAlunoCriar {
  email: string;
  senha: string;
  nome: string;
  telefone: string;
  data_nascimento: DataIso;
  cpf?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  /** Só admin. */
  professor_id?: number | null;
}

export interface GestaoAlunoAtualizar {
  nome: string;
  telefone: string;
  data_nascimento: DataIso;
  cpf?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
}

export interface AlunoStatusAtualizar {
  ativo: boolean;
}

export interface AlunoProfessorAtualizar {
  professor_id: number | null;
}

export interface AlunoRestricaoAtualizar {
  restricao_acesso: string | null;
}

/* --------------------------------- Equipe --------------------------------- */

export interface ProfessorGestaoItem {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  foto: string | null;
  ativo: boolean;
  criado_em: DataHoraIso | null;
  total_alunos: number;
  total_fichas: number;
  total_avaliacoes: number;
}

export interface AtividadeAuditoria {
  id: number;
  data_hora: DataHoraIso;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  descricao: string;
}

export interface ProfessorFichaResumo {
  id: number;
  nome: string;
  aluno: RefNome | null;
  status: 'rascunho' | 'publicada';
  atualizado_em: DataHoraIso | null;
}

export interface ProfessorAvaliacaoResumo {
  id: number;
  aluno: RefNome | null;
  data_avaliacao: DataIso;
}

/** Aluno no resumo do detalhe do professor (`GET /admin/professores/{id}`). */
export interface AlunoDoProfessor extends RefNome {
  telefone: string;
  ativo: boolean;
  status_cadastro: StatusCadastro;
  professor_vinculado_em: DataHoraIso | null;
}

export interface ProfessorGestaoDetalhe extends ProfessorGestaoItem {
  alunos: AlunoDoProfessor[];
  fichas: ProfessorFichaResumo[];
  avaliacoes_recentes: ProfessorAvaliacaoResumo[];
  atividade: AtividadeAuditoria[];
}

export interface ProfessorCriar {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
}

export interface ProfessorAtualizar {
  nome: string;
  telefone: string;
  email: string;
}

export interface StatusAtualizar {
  ativo: boolean;
}

export interface TransferirAlunos {
  destino_professor_id: number | null;
  /** Sem `aluno_ids` = todos os alunos do professor de origem. */
  aluno_ids?: number[];
}

export interface TransferirAlunosResposta {
  transferidos: number;
}

export interface RecepcionistaItem {
  id: number;
  /** Id da conta (`usuario.id`): filtra `GET /admin/auditoria?user_id=`. */
  user_id: number;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
  criado_em: DataHoraIso | null;
  permissoes: PermissaoRecepcao[];
}

export interface RecepcionistaDetalhe extends RecepcionistaItem {
  atividade: AtividadeAuditoria[];
}

export interface RecepcionistaCriar {
  email: string;
  senha: string;
  nome: string;
  telefone: string;
  permissoes?: PermissaoRecepcao[];
}

export interface RecepcionistaAtualizar {
  nome: string;
  telefone: string;
  email?: string;
}

export interface PermissoesAtualizar {
  permissoes: PermissaoRecepcao[];
}

/* --------------------------------- Planos --------------------------------- */

export interface PlanoResposta {
  id: number;
  nome: string;
  descricao: string | null;
  duracao_dias: number;
  valor: Dinheiro;
  periodicidade: Periodicidade;
  renovacao_automatica: boolean;
  condicoes: string | null;
  ativo: boolean;
  criado_em: DataHoraIso | null;
  /** Matrículas `ativa` no plano. */
  total_alunos: number;
}

export interface PlanoCriar {
  nome: string;
  descricao?: string | null;
  duracao_dias: number;
  valor: Dinheiro;
  periodicidade: Periodicidade;
  renovacao_automatica?: boolean;
  condicoes?: string | null;
}

export type PlanoAtualizar = PlanoCriar;

export interface FiltrosPlanos {
  ativo?: boolean;
}

export interface PlanoAlunoResumo extends RefNome {
  data_vencimento: DataIso;
  situacao: SituacaoMatricula;
}

/* ------------------------------- Matrículas ------------------------------- */

export interface FiltrosMatriculas extends ParametrosPagina {
  aluno_id?: number;
  status?: StatusMatricula;
  situacao?: SituacaoMatricula;
  plano_id?: number;
}

export interface MatriculaResposta {
  id: number;
  aluno: RefNome;
  plano: RefNome;
  data_inicio: DataIso;
  data_vencimento: DataIso;
  valor: Dinheiro;
  status: StatusMatricula;
  situacao: SituacaoMatricula;
  motivo_cancelamento: string | null;
  cancelada_em: DataHoraIso | null;
  matricula_anterior_id: number | null;
  criado_em: DataHoraIso | null;
}

export interface MatriculaCriar {
  aluno_id: number;
  plano_id: number;
  data_inicio?: DataIso;
}

export interface MatriculaRenovar {
  /** Padrão no servidor: o mesmo plano. */
  plano_id?: number;
}

export interface MatriculaAlterarPlano {
  plano_id: number;
}

export interface MatriculaCancelar {
  motivo: string;
}

/* ------------------------------- Pagamentos ------------------------------- */

export interface FiltrosPagamentos extends ParametrosPagina {
  status?: StatusPagamento;
  aluno_id?: number;
  inicio?: DataIso;
  fim?: DataIso;
  inadimplentes?: boolean;
}

export interface PagamentoResposta {
  id: number;
  aluno: RefNome;
  matricula_id: number | null;
  descricao: string;
  valor: Dinheiro;
  vencimento: DataIso;
  status: StatusPagamento;
  forma: FormaPagamento | null;
  valor_recebido: Dinheiro | null;
  pago_em: DataHoraIso | null;
  motivo_estorno: string | null;
  estornado_em: DataHoraIso | null;
  criado_em: DataHoraIso | null;
}

export interface PagamentoRegistrar {
  forma: FormaPagamento;
  /** Padrão no servidor: o valor do pagamento. */
  valor_recebido?: Dinheiro;
  pago_em?: DataHoraIso;
}

export interface PagamentoAvulsoCriar {
  aluno_id: number;
  descricao: string;
  valor: Dinheiro;
  forma: FormaPagamento;
}

export interface PagamentoEstornar {
  motivo: string;
}

export interface Comprovante {
  numero: string;
  aluno: RefNome;
  descricao: string;
  valor: Dinheiro;
  valor_recebido: Dinheiro | null;
  forma: FormaPagamento | null;
  pago_em: DataHoraIso | null;
  registrado_por: string | null;
  academia: {
    nome: string;
    endereco: string | null;
    telefone: string | null;
  };
}

/* --------------------------------- Acessos -------------------------------- */

/** Informe `aluno_id` ou `codigo`. */
export interface ConsultaAcesso {
  aluno_id?: number;
  codigo?: string;
}

export interface MotivoAcesso {
  codigo: MotivoBloqueio;
  mensagem: string;
}

export interface AcessoResposta {
  id: number;
  aluno: RefNome;
  data_hora: DataHoraIso;
  resultado: ResultadoAcesso;
  motivos: MotivoBloqueio[];
  origem: OrigemAcesso;
  liberacao_manual: boolean;
}

/** Entrada resumida de `GET /acessos/verificar` (sem aluno nem motivos). */
export interface EntradaResumo {
  id: number;
  data_hora: DataHoraIso;
  resultado: ResultadoAcesso;
  liberacao_manual: boolean;
}

export interface AcessoVerificacao {
  aluno: {
    id: number;
    nome: string;
    foto: string | null;
    status_cadastro: StatusCadastro;
    ativo: boolean;
  };
  autorizado: boolean;
  motivos: MotivoAcesso[];
  matricula: {
    plano: string;
    data_vencimento: DataIso;
    situacao: SituacaoMatricula;
  } | null;
  pendencias: { quantidade: number; valor_total: Dinheiro };
  ultimas_entradas: EntradaResumo[];
}

export interface AcessoRegistrar {
  aluno_id?: number;
  codigo?: string;
  origem?: OrigemAcesso;
  forcar?: boolean;
}

export interface FiltrosAcessos extends ParametrosPagina {
  /** Padrão no servidor: hoje. */
  data?: DataIso;
  aluno_id?: number;
  resultado?: ResultadoAcesso;
}

/* --------------------------------- Painéis -------------------------------- */

export interface DashboardAdmin {
  totais: {
    alunos: number;
    ativos: number;
    inativos: number;
    pendentes: number;
    vencidos: number;
    vencendo: number;
    inadimplentes: number;
    professores: number;
    recepcionistas: number;
  };
  alunos_recentes: GestaoAlunoItem[];
  alunos_por_professor: {
    professor_id: number | null;
    nome: string;
    total: number;
  }[];
  alunos_por_plano: { plano_id: number; nome: string; total: number }[];
  matriculas: {
    novas_mes: number;
    renovacoes_mes: number;
    cancelamentos_mes: number;
  };
  series: {
    /** `mes` no formato "2026-11". */
    cadastros_por_mes: { mes: string; total: number }[];
    /** Cadastros sem data de criação (legado). */
    sem_data?: number;
    frequencia_por_mes: {
      mes: string;
      entradas: number;
      alunos_distintos: number;
    }[];
    ativos_inativos: { ativos: number; inativos: number };
  };
}

export interface DashboardRecepcao {
  ativos: number;
  entradas_hoje: number;
  matriculas_hoje: number;
  vencendo: number;
  vencidos: number;
  com_pendencia: number;
  cadastros_pendentes: number;
  ultimos_cadastros: GestaoAlunoItem[];
  atendimentos_recentes: AtividadeAuditoria[];
}

export interface FiltrosFinanceiro {
  inicio?: DataIso;
  fim?: DataIso;
}

export interface Financeiro {
  recebido_periodo: Dinheiro;
  pendente_total: Dinheiro;
  vencido_total: Dinheiro;
  inadimplentes: number;
  recebido_por_mes: { mes: string; total: Dinheiro }[];
  recebido_por_forma: { forma: FormaPagamento; total: Dinheiro }[];
}

/* ----------------------- Configuração e auditoria ------------------------- */

export type DiaHorario =
  | 'segunda'
  | 'terça'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sábado'
  | 'domingo';

export interface HorarioFuncionamento {
  dia: DiaHorario;
  /** "HH:MM". */
  abre: string;
  fecha: string;
  fechado: boolean;
}

export interface ConfiguracaoPublica {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  horarios: HorarioFuncionamento[];
}

export interface ConfiguracaoAdmin extends ConfiguracaoPublica {
  tolerancia_dias_vencimento: number;
  bloquear_pagamento_pendente: boolean;
  dias_alerta_vencimento: number;
  dias_reavaliacao: number;
  dias_atualizar_treino: number;
  atualizado_em: DataHoraIso | null;
}

export type ConfiguracaoAtualizar = Omit<ConfiguracaoAdmin, 'atualizado_em'>;

export interface FiltrosAuditoria extends ParametrosPagina {
  user_id?: number;
  acao?: string;
  entidade?: string;
  entidade_id?: number;
  inicio?: DataIso;
  fim?: DataIso;
}

export interface AuditoriaItem {
  id: number;
  data_hora: DataHoraIso;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  descricao: string;
  detalhes: Record<string, unknown> | null;
  usuario: { id: number; nome: string; tipo: string } | null;
}

/* ------------------------- Perfil da recepção ----------------------------- */

export interface PerfilRecepcao {
  id: number;
  nome: string;
  telefone: string;
  permissoes: PermissaoRecepcao[];
}

export interface PerfilRecepcaoAtualizar {
  nome: string;
  telefone: string;
}
