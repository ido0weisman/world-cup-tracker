import apiClient from './client';

export const submitGroupBet     = (data) => apiClient.post('/bets/group', data).then(r => r.data);
export const getGroupBets       = ()     => apiClient.get('/bets/group').then(r => r.data);

export const submitKnockoutBet  = (data) => apiClient.post('/bets/knockout', data).then(r => r.data);
export const getKnockoutBets    = ()     => apiClient.get('/bets/knockout').then(r => r.data);

export const submitTopScorerBet = (data) => apiClient.post('/bets/top-scorer', data).then(r => r.data);
export const getTopScorerBet    = ()     => apiClient.get('/bets/top-scorer').then(r => r.data);

export const getLeaderboard     = ()     => apiClient.get('/bets/leaderboard').then(r => r.data);
