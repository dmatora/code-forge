import React, { useState } from 'react';
import { Box, Heading, Button, Flex } from '@chakra-ui/react';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import PromptInterface from './components/PromptInterface';
import { Project } from './types';

enum View {
  ProjectList,
  ProjectForm,
  PromptInterface
}

export function App() {
  const [view, setView] = useState<View>(View.ProjectList);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    setView(View.PromptInterface);
  };

  const handleCreateProject = () => {
    setCurrentProject(null);
    setView(View.ProjectForm);
  };

  const handleEditProject = () => {
    if (currentProject) {
      setView(View.ProjectForm);
    }
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
      setView(View.PromptInterface);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleCancel = () => {
    if (currentProject) {
      setView(View.PromptInterface);
    } else {
      setView(View.ProjectList);
    }
  };

  const renderView = () => {
    switch (view) {
      case View.ProjectList:
        return (
          <ProjectList
            onSelectProject={handleProjectSelect}
            onCreateNew={handleCreateProject}
          />
        );
      case View.ProjectForm:
        return (
          <ProjectForm
            project={currentProject || undefined}
            onSave={handleProjectSave}
            onCancel={handleCancel}
          />
        );
      case View.PromptInterface:
        return currentProject ? (
          <Box>
            <Flex mb={4}>
              <Button onClick={() => setView(View.ProjectList)} mr={2}>
                Back to Projects
              </Button>
              <Button onClick={handleEditProject}>
                Edit Project
              </Button>
            </Flex>
            <PromptInterface project={currentProject} />
          </Box>
        ) : null;
    }
  };

  return (
    <Box maxW="1200px" mx="auto" p={5}>
      <Box as="main" minH="500px">
        {renderView()}
      </Box>
    </Box>
  );
}

export default App;
