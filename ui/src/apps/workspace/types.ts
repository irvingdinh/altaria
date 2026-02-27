export interface Workspace {
  id: string;
  name: string;
  directory: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  directory: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  directory?: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
}
