import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useFolders() {
  const {
    data: folders,
    isLoading: isLoadingFolders,
    error
  } = useQuery<Folder[]>({
    queryKey: ['/api/folders'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  return { folders: folders || [], isLoadingFolders, error };
}