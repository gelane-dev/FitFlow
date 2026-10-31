// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*'],
  },
  {
    rules: {
      // Desligada: todos os hooks de dados do app carregam no mount com
      // `useEffect(() => { carregar(); }, [carregar])` (setState dentro da
      // função assíncrona). É o padrão do projeto; migrar para outra
      // abordagem de data fetching mudaria o comportamento e exige ADR.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
