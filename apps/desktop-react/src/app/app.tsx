import React, { useState } from 'react';
import { Box, Heading, Button, Flex } from '@chakra-ui/react';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import ScopeList from './components/ScopeList';
import ScopeForm from './components/ScopeForm';
import PromptInterface from './components/PromptInterface';
import ApiConfigForm from './components/ApiConfigForm';
import { Project, Scope } from './types';

enum View {
  ProjectList,
  ProjectForm,
  ScopeList,
  ScopeForm,
  PromptInterface,
  ApiConfig
}

export function App() {
  const [view, setView] = useState<View>(View.ProjectList);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentScope, setCurrentScope] = useState<Scope | null>(null);

  // Project-related handlers
  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    setView(View.ScopeList);
  };

  const handleCreateProject = () => {
    setCurrentProject(null);
    setView(View.ProjectForm);
  };

  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setView(View.ProjectForm);
  };

  const handleProjectSave = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      let savedProject;
      if (currentProject) {
        savedProject = await window.electron.updateProject({
          ...currentProject,
          ...projectData
        });
      } else {
        savedProject = await window.electron.createProject(projectData);
      }

      setCurrentProject(savedProject);
      setView(View.ScopeList);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  // Scope-related handlers
  const handleScopeSelect = (scope: Scope) => {
    setCurrentScope(scope);
    setView(View.PromptInterface);
  };

  const handleCreateScope = () => {
    setCurrentScope(null);
    setView(View.ScopeForm);
  };

  const handleEditScope = (scope: Scope) => {
    setCurrentScope(scope);
    setView(View.ScopeForm);
  };

  const handleScopeSave = async (scopeData: Omit<Scope, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      let savedScope;
      if (currentScope) {
        savedScope = await window.electron.updateScope({
          ...currentScope,
          ...scopeData
        });
      } else {
        savedScope = await window.electron.createScope(scopeData);
      }

      setCurrentScope(savedScope);
      setView(View.PromptInterface);
    } catch (error) {
      console.error('Failed to save scope:', error);
    }
  };

  // API config handler
  const handleOpenApiConfig = () => {
    setView(View.ApiConfig);
  };

  // Navigation handlers
  const handleBackToProjects = () => {
    setView(View.ProjectList);
  };

  const handleBackToScopes = () => {
    if (currentProject) {
      setView(View.ScopeList);
    } else {
      setView(View.ProjectList);
    }
  };

  // Render the appropriate view
  const renderView = () => {
    switch (view) {
      case View.ProjectList:
        return (
          <ProjectList
            onSelectProject={handleProjectSelect}
            onCreateNew={handleCreateProject}
            onOpenApiConfig={handleOpenApiConfig}
            onEditProject={handleEditProject}
          />
        );

      case View.ProjectForm:
        return (
          <ProjectForm
            project={currentProject || undefined}
            onSave={handleProjectSave}
            onCancel={handleBackToProjects}
          />
        );

      case View.ScopeList:
        return currentProject ? (
          <ScopeList
            project={currentProject}
            onSelectScope={handleScopeSelect}
            onCreateNew={handleCreateScope}
            onBack={handleBackToProjects}
            onEditProject={() => handleEditProject(currentProject)}
            onEditScope={handleEditScope}
          />
        ) : null;

      case View.ScopeForm:
        return (currentProject) ? (
          <ScopeForm
            scope={currentScope || undefined}
            project={currentProject}
            onSave={handleScopeSave}
            onCancel={handleBackToScopes}
          />
        ) : null;

      case View.PromptInterface:
        return (currentProject && currentScope) ? (
          <PromptInterface
            project={currentProject}
            scope={currentScope}
            onBack={handleBackToScopes}
            onOpenApiConfig={handleOpenApiConfig}
          />
        ) : null;

      case View.ApiConfig:
        return (
          <ApiConfigForm
            onSave={() => {
              if (currentScope && currentProject) {
                setView(View.PromptInterface);
              } else if (currentProject) {
                setView(View.ScopeList);
              } else {
                setView(View.ProjectList);
              }
            }}
            onCancel={() => {
              if (currentScope && currentProject) {
                setView(View.PromptInterface);
              } else if (currentProject) {
                setView(View.ScopeList);
              } else {
                setView(View.ProjectList);
              }
            }}
          />
        );
    }
  };

  return (
    <Box p={4}>
      <Box mb={4}>
        {renderView()}
      </Box>
    </Box>
  );
}

export default App;
