export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface GitFileStatus {
  path: string;
  status: string;
}

export interface GitStatusResponse {
  files: GitFileStatus[];
}

export interface GitDiffResponse {
  diff: string;
}

export type WorkspaceView = "terminal" | "files" | "git";
