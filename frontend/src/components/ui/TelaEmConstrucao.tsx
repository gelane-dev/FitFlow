import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';

import { Botao } from './Botao';
import { CabecalhoGrande } from './CabecalhoGrande';
import { EstadoVazio } from './EstadoVazio';
import { Tela } from './Tela';

export interface TelaEmConstrucaoProps {
  /** Rótulo pequeno acima do título (ex.: "Administração"). */
  rotulo?: string;
  titulo: string;
  icone?: keyof typeof Ionicons.glyphMap;
  /** Mostra o botão "Sair" (abas de perfil das áreas ainda sem a tela real). */
  comSair?: boolean;
}

/** Placeholder de aba das áreas em construção (admin e recepção, GA-03 a GA-12). */
export function TelaEmConstrucao({ rotulo, titulo, icone = 'construct-outline', comSair = false }: TelaEmConstrucaoProps) {
  const { sair } = useAuth();

  return (
    <Tela abas>
      <CabecalhoGrande rotulo={rotulo} titulo={titulo} />
      <EstadoVazio icone={icone} titulo="Em construção" descricao="Esta área será liberada em breve." />
      {comSair ? (
        <Botao variante="secundario" onPress={sair} testID="botao-sair">
          Sair
        </Botao>
      ) : null}
    </Tela>
  );
}
