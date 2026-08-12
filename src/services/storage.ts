import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error('AsyncStorage setItem error:', error);
        }
    },
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(key);
        } catch (error) {
            console.error('AsyncStorage getItem error:', error);
            return null;
        }
    },
    deleteItem: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('AsyncStorage deleteItem error:', error);
        }
    }
};
