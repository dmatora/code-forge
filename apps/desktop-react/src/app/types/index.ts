export interface Project {
  id: string;
  name: string;
  rootFolder: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scope {
  id: string;
  name: string;
  folders: string[];
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}
