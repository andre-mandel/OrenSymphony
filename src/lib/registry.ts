import { useCallback, useEffect, useState } from 'react';
import { api, type Model, type Provider, type MCPServer, type MCPTool } from './api';

export function useProviders() {
  const [data, setData] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Provider[]>('/api/providers');
      setData(list);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export function useModels() {
  const [data, setData] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get<Model[]>('/api/models');
      setData(list);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export function useMcpServers() {
  const [data, setData] = useState<MCPServer[]>([]);
  const refresh = useCallback(async () => {
    const list = await api.get<MCPServer[]>('/api/mcp/servers');
    setData(list);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, refresh };
}

export function useMcpTools() {
  const [data, setData] = useState<MCPTool[]>([]);
  const refresh = useCallback(async () => {
    const list = await api.get<MCPTool[]>('/api/mcp/tools');
    setData(list);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, refresh };
}
