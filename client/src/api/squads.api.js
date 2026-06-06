import apiClient from './client';

export const getTeamSquad = (teamCode) =>
  apiClient.get(`/squads/${teamCode}`).then(r => r.data);
