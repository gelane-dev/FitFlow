/** Rótulos das ações e entidades da auditoria (Contrato-Gestao, "Ações gravadas"). Funções puras. */

const ENTIDADES: Record<string, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  recepcionista: 'Recepcionista',
  plano: 'Plano',
  matricula: 'Matrícula',
  pagamento: 'Pagamento',
  acesso: 'Entrada',
  configuracao: 'Configuração',
  ficha: 'Ficha',
  treino: 'Treino',
  item: 'Item de treino',
};

const VERBOS: Record<string, string> = {
  cadastrar: 'cadastrado',
  criar: 'criado',
  editar: 'editado',
  aprovar: 'aprovado',
  recusar: 'recusado',
  ativar: 'ativado',
  desativar: 'desativado',
  trocar_professor: 'trocou de professor',
  restricao: 'restrição de acesso alterada',
  transferir_alunos: 'alunos transferidos',
  permissoes: 'permissões alteradas',
  renovar: 'renovada',
  alterar_plano: 'plano alterado',
  cancelar: 'cancelada',
  registrar: 'recebido',
  avulso: 'avulso lançado',
  estornar: 'estornado',
  liberado_manual: 'liberada manualmente',
  publicar: 'publicada',
  duplicar: 'duplicada',
  excluir: 'excluída',
};

/** Entidades femininas: o particípio concorda ("Matrícula criada"). */
const ENTIDADES_FEMININAS = new Set(['matricula', 'ficha', 'configuracao']);

export const ENTIDADES_AUDITORIA = Object.entries(ENTIDADES).map(([valor, rotulo]) => ({ valor, rotulo }));

/** Ações que o admin consegue filtrar (as de gestão; entradas comuns não vão para a auditoria). */
export const ACOES_AUDITORIA: string[] = [
  'aluno.cadastrar',
  'aluno.editar',
  'aluno.aprovar',
  'aluno.recusar',
  'aluno.ativar',
  'aluno.desativar',
  'aluno.trocar_professor',
  'aluno.restricao',
  'professor.criar',
  'professor.editar',
  'professor.ativar',
  'professor.desativar',
  'professor.transferir_alunos',
  'recepcionista.criar',
  'recepcionista.editar',
  'recepcionista.ativar',
  'recepcionista.desativar',
  'recepcionista.permissoes',
  'plano.criar',
  'plano.editar',
  'plano.ativar',
  'plano.desativar',
  'matricula.criar',
  'matricula.renovar',
  'matricula.alterar_plano',
  'matricula.cancelar',
  'pagamento.registrar',
  'pagamento.avulso',
  'pagamento.estornar',
  'acesso.liberado_manual',
  'configuracao.editar',
  'ficha.criar',
  'ficha.editar',
  'ficha.publicar',
  'ficha.duplicar',
  'ficha.excluir',
];

export function rotuloEntidade(entidade: string): string {
  return ENTIDADES[entidade] ?? entidade;
}

/** "plano.criar" -> "Plano criado"; ação fora da lista volta como veio. */
export function rotuloAcao(acao: string): string {
  const [entidade, ...resto] = acao.split('.');
  const verbo = VERBOS[resto.join('.')];

  if (!entidade || !verbo || !ENTIDADES[entidade]) return acao;

  const feminina = ENTIDADES_FEMININAS.has(entidade);

  return `${ENTIDADES[entidade]} ${feminina && /(ado|ido)$/.test(verbo) ? `${verbo.slice(0, -1)}a` : verbo}`;
}

const ROTULOS_USUARIO: Record<string, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  recepcao: 'Recepção',
  aluno: 'Aluno',
};

export function rotuloTipoUsuario(tipo: string): string {
  return ROTULOS_USUARIO[tipo] ?? tipo;
}

/** Valor de um campo de `detalhes` como texto curto legível. */
export function formatarDetalhe(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (Array.isArray(valor)) return valor.length === 0 ? '—' : valor.map(formatarDetalhe).join(', ');
  if (typeof valor === 'object') return JSON.stringify(valor);

  return String(valor);
}
