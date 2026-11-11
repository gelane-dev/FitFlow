import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { buscarPerfilProfessor } from '@/services/usuario.service';

/** Cache por usuário logado (`usuarios.id`): outra conta na mesma sessão do navegador nunca herda o id da anterior. */
const idPorUsuario = new Map<number, number>();

/**
 * Id do professor logado (`professores.id`, o mesmo de `criado_por_professor_id`); `null` enquanto
 * carrega ou sem sessão. Segue o usuário do `AuthContext`: ao trocar de conta, o id é buscado de novo.
 */
export function useProfessorId(): number | null {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id ?? null;
  const [encontrado, setEncontrado] = useState<{ usuarioId: number; id: number } | null>(null);

  useEffect(() => {
    if (usuarioId === null || idPorUsuario.has(usuarioId)) {
      return undefined;
    }

    let ativo = true;

    buscarPerfilProfessor()
      .then((perfil) => {
        idPorUsuario.set(usuarioId, perfil.id);

        if (ativo) {
          setEncontrado({ usuarioId, id: perfil.id });
        }
      })
      .catch(() => {
        // Sem o id, só os exercícios da biblioteca ficam editáveis; o backend decide de qualquer forma.
      });

    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  if (usuarioId === null) {
    return null;
  }

  return idPorUsuario.get(usuarioId) ?? (encontrado?.usuarioId === usuarioId ? encontrado.id : null);
}

/** Limpa o cache (testes). O cache já é por usuário, então logout/troca de conta não precisam chamá-lo. */
export function limparProfessorIdEmCache() {
  idPorUsuario.clear();
}
