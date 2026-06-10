import apiClient from './client';

export const getOracleProfile      = ()       => apiClient.get('/oracle/profile').then(r => r.data);
export const saveOracleProfile     = (data)   => apiClient.post('/oracle/profile', data).then(r => r.data);
export const getTodayPredictions   = ()       => apiClient.get('/oracle/today').then(r => r.data);
export const getOraclePrediction   = (matchId)=> apiClient.get(`/oracle/predictions/${matchId}`).then(r => r.data);
export const submitOracleBet       = (data)   => apiClient.post('/oracle/bet', data).then(r => r.data);
export const getOracleBet          = (matchId)=> apiClient.get(`/oracle/bet/${matchId}`).then(r => r.data);
export const getOracleAccuracy     = ()       => apiClient.get('/oracle/accuracy').then(r => r.data);
