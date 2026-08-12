import api from './api';
import { Platform } from 'react-native';

export const userService = {
    getProfile: async (): Promise<any> => {
        const response = await api.get('/users/profile');
        return response.data;
    },

    updateProfile: async (data: Record<string, any>): Promise<any> => {
        const response = await api.put('/users/profile', data);
        return response.data;
    },

    uploadImage: async (uri: string): Promise<any> => {
        const formData = new FormData();

        // Get file extension from URI
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('image', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: `upload.${fileType}`,
            type: `image/${fileType}`,
        } as any);

        const response = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

export default userService;
