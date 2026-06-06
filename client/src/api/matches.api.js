import apiClient from './client';

export const getMatchesToday    = () => apiClient.get('/matches/today').then(r => r.data);
export const getMatchesThisWeek = () => apiClient.get('/matches/week').then(r => r.data);
