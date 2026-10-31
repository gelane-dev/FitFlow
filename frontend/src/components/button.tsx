import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, } from 'react-native';

export function Button({ children, ...rest}: TouchableOpacityProps & { children: React.ReactNode; }) {
  return ( <TouchableOpacity style={styles.botao} {...rest}>
      <Text style={styles.texto}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: '100%',
    height: 52,
    backgroundColor: '#FECF2B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  texto: {
    color: '#111111',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});