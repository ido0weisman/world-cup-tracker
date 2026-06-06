import apiClient from './client';

export const getKnockoutBracket = () => apiClient.get('/knockout').then(r => r.data);
