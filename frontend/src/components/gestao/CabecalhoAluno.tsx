import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { SeloSituacao } from '@/components/ui/SeloSituacao';
import { cores } from '@/theme';
import type { StatusCadastro, SituacaoMatricula } from '@/types/gestao.types';
import { situacaoPrincipalAluno } from '@/utils/gestaoRecepcao';
import { situacaoAluno, statusCadastro } from '@/utils/situacao';

export interface AlunoCabecalho {
  nome: string;
  foto: string | null;
  email?: string;
  telefone?: string;
  ativo: boolean;
  status_cadastro: StatusCadastro;
  situacao: SituacaoMatricula;
  inadimplente?: boolean;
  plano_atual?: { id: number; nome: string } | null;
}

export interface CabecalhoAlunoProps {
  aluno: AlunoCabecalho;
  tamanhoFoto?: number;
  /** Botões à direita/abaixo (editar, aprovar...). */
  acoes?: ReactNode;
  testID?: string;
}

/** Foto, nome, contato e a situação do aluno (selo com cor + ícone + texto). Compartilhado com o admin. */
export function CabecalhoAluno({ aluno, tamanhoFoto = 72, acoes, testID = 'cabecalho-aluno' }: CabecalhoAlunoProps) {
  const codigo = situacaoPrincipalAluno(aluno);

  return (
    <View style={estilos.raiz} testID={testID}>
      <Avatar uri={aluno.foto} nome={aluno.nome} tamanho={tamanhoFoto} />
      <View style={estilos.texto}>
        <Text style={estilos.nome} numberOfLines={2} accessibilityRole="header">
          {aluno.nome}
        </Text>
        {aluno.email ? (
          <Text style={estilos.contato} numberOfLines={1}>
            {aluno.email}
          </Text>
        ) : null}
        {aluno.telefone ? <Text style={estilos.contato}>{aluno.telefone}</Text> : null}
        <View style={estilos.selos}>
          <SeloSituacao
            info={codigo === 'recusado' ? statusCadastro('recusado') : situacaoAluno(codigo)}
            testID={`${testID}-situacao`}
          />
          {aluno.inadimplente && codigo !== 'inadimplente' ? (
            <SeloSituacao info={situacaoAluno('inadimplente')} testID={`${testID}-inadimplente`} />
          ) : null}
          {aluno.plano_atual ? <Text style={estilos.plano}>{aluno.plano_atual.nome}</Text> : null}
        </View>
      </View>
      {acoes ? <View style={estilos.acoes}>{acoes}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  texto: { flex: 1, minWidth: 200, gap: 4 },
  nome: { color: cores.texto, fontSize: 22, fontWeight: '700' },
  contato: { color: cores.textoSecundario, fontSize: 14 },
  selos: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  plano: { color: cores.textoSecundario, fontSize: 13 },
  acoes: { gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
});
