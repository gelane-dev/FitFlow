import { Href, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/ui/Botao';
import { CabecalhoGrande } from '@/components/ui/CabecalhoGrande';
import { Cartao } from '@/components/ui/Cartao';
import { ConteudoLargo } from '@/components/ui/ConteudoLargo';
import { LinhaLista } from '@/components/ui/LinhaLista';
import { Tela } from '@/components/ui/Tela';
import { useAuth } from '@/hooks/useAuth';
import { espacamento } from '@/theme';

const ITENS: { chave: string; titulo: string; subtitulo: string; icone: React.ComponentProps<typeof LinhaLista>['icone']; rota: string }[] = [
  { chave: 'planos', titulo: 'Planos', subtitulo: 'Valores, duração e alunos de cada plano', icone: 'pricetags-outline', rota: '/admin/planos' },
  { chave: 'matriculas', titulo: 'Matrículas', subtitulo: 'Acompanhe, renove, altere e cancele', icone: 'document-text-outline', rota: '/admin/matriculas' },
  { chave: 'configuracoes', titulo: 'Configurações', subtitulo: 'Dados da academia, horários e regras de acesso', icone: 'settings-outline', rota: '/admin/configuracoes' },
  { chave: 'auditoria', titulo: 'Auditoria', subtitulo: 'Quem fez o quê, e quando', icone: 'shield-checkmark-outline', rota: '/admin/auditoria' },
  { chave: 'perfil', titulo: 'Perfil', subtitulo: 'Seus dados, foto e senha', icone: 'person-circle-outline', rota: '/admin/meu-perfil' },
];

/** Aba "Mais" do admin: leva a Planos, Matrículas, Configurações, Auditoria e Perfil. */
export default function MaisAdmin() {
  const { sair } = useAuth();

  return (
    <Tela abas testID="mais-admin">
      <ConteudoLargo larguraMaxima={760}>
        <CabecalhoGrande rotulo="Administração" titulo="Mais" />

        <Cartao semPadding>
          {ITENS.map((item, indice) => (
            <LinhaLista
              key={item.chave}
              titulo={item.titulo}
              subtitulo={item.subtitulo}
              icone={item.icone}
              separador={indice < ITENS.length - 1}
              onPress={() => router.push(item.rota as Href)}
              testID={`mais-${item.chave}`}
            />
          ))}
        </Cartao>

        <View style={estilos.sair}>
          <Botao variante="secundario" icone="log-out-outline" onPress={sair} testID="botao-sair">
            Sair
          </Botao>
        </View>
      </ConteudoLargo>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  sair: { marginTop: espacamento.xxl },
});
