import apiClient from './client';

export const getAllGroups    = ()     => apiClient.get('/groups').then(r => r.data);
export const getGroupByName = (name) => apiClient.get(`/groups/${name}`).then(r => r.data);
