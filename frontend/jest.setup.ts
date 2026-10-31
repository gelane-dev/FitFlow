// Os testes mockam por arquivo o que precisam (secureStorage, notifications).
// Aqui fica só o que vale para todos: nada de variável de ambiente de produção.
process.env.EXPO_PUBLIC_API_URL = 'http://api.teste';
