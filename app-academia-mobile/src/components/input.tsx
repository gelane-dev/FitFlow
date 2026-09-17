import { StyleSheet, TextInput, TextInputProps } from "react-native";

export function Input ({ ...rest}: TextInputProps ){
    return ( <TextInput style={styles.input} {...rest} /> );

}

const styles = StyleSheet.create({
    input: {
        width: '100%',
        height: 52,
        backgroundColor: 'rgba(20, 20, 20, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 8,
        paddingHorizontal: 15,
        color: '#FFFFFF',
        fontSize: 15,
        marginBottom: 22,
    },
});