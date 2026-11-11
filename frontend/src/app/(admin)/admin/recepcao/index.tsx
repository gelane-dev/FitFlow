import { Href, Redirect } from 'expo-router';

/** `/admin/recepcao` (contrato): a lista da recepção vive na aba Equipe. */
export default function RecepcaoAdmin() {
  return <Redirect href={'/admin/professores?aba=recepcao' as Href} />;
}
