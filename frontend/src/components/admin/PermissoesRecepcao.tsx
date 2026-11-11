import { StyleSheet, View } from 'react-native';

import { PermissaoRecepcao, PERMISSOES_RECEPCAO } from '@/types/gestao.types';
import { cores } from '@/theme';

import { CampoInterruptor } from './CampoInterruptor';

/** Rótulos e explicações em linguagem do dia a dia para cada permissão (Contrato-Gestao, Papéis). */
export const ROTULOS_PERMISSAO: Record<PermissaoRecepcao, { rotulo: string; descricao: string }> = {
  cadastrar_aluno: { rotulo: 'Cadastrar alunos', descricao: 'Criar o cadastro de um novo aluno.' },
  editar_aluno: { rotulo: 'Editar dados do aluno', descricao: 'Alterar contato, CPF, endereço e observações.' },
  aprovar_aluno: { rotulo: 'Aprovar ou recusar cadastros', descricao: 'Decidir sobre cadastros feitos pelo próprio aluno.' },
  matricular: { rotulo: 'Matricular alunos', descricao: 'Vincular um aluno a um plano.' },
  renovar_matricula: { rotulo: 'Renovar matrículas', descricao: 'Estender a matrícula de quem já tem plano.' },
  alterar_plano: { rotulo: 'Trocar o plano do aluno', descricao: 'Substitui a matrícula atual por outra.' },
  cancelar_matricula: { rotulo: 'Cancelar matrículas', descricao: 'Encerra a matrícula e cancela pagamentos pendentes.' },
  registrar_pagamento: { rotulo: 'Registrar pagamentos', descricao: 'Dar baixa em cobranças e lançar pagamentos avulsos.' },
  estornar_pagamento: { rotulo: 'Estornar pagamentos', descricao: 'Desfazer um pagamento já recebido.' },
  registrar_acesso: { rotulo: 'Registrar entradas', descricao: 'Controlar a entrada dos alunos na academia.' },
  liberar_acesso_manual: { rotulo: 'Liberar entrada bloqueada', descricao: 'Permitir a entrada mesmo quando o sistema bloqueia.' },
};

export interface PermissoesRecepcaoProps {
  permissoes: PermissaoRecepcao[];
  aoMudar: (permissoes: PermissaoRecepcao[]) => void;
  disabled?: boolean;
}

/** Um interruptor por permissão; mantém a ordem do contrato. */
export function PermissoesRecepcao({ permissoes, aoMudar, disabled }: PermissoesRecepcaoProps) {
  function alternar(permissao: PermissaoRecepcao, ligada: boolean) {
    const atuais = new Set(permissoes);

    if (ligada) atuais.add(permissao);
    else atuais.delete(permissao);

    aoMudar(PERMISSOES_RECEPCAO.filter((p) => atuais.has(p)));
  }

  return (
    <View style={estilos.lista}>
      {PERMISSOES_RECEPCAO.map((permissao) => (
        <View key={permissao} style={estilos.item}>
          <CampoInterruptor
            rotulo={ROTULOS_PERMISSAO[permissao].rotulo}
            descricao={ROTULOS_PERMISSAO[permissao].descricao}
            valor={permissoes.includes(permissao)}
            aoMudar={(ligada) => alternar(permissao, ligada)}
            disabled={disabled}
            testID={`permissao-${permissao}`}
          />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {},
  item: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cores.borda },
});
