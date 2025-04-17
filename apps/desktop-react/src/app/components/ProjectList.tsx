import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  List,
  ListItem,
  Flex
} from '@chakra-ui/react';
import { Project } from '../types';

const ProjectList: React.FC<{
  onSelectProject: (project: Project) => void;
  onCreateNew: () => void;
  onOpenApiConfig: () => void;
}> = ({ onSelectProject, onCreateNew, onOpenApiConfig }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await window.electron.getProjects();
        setProjects(projects);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) {
    return (
      <Box p={4}>
        Loading projects...
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">Your Projects</Heading>
        <Flex>
          <Button colorScheme="teal" onClick={onOpenApiConfig} mr={2}>API Settings</Button>
          <Button colorScheme="blue" onClick={onCreateNew}>Create New Project</Button>
        </Flex>
      </Flex>

      {projects.length === 0 ? (
        <Text>
          No projects yet. Create your first project to get started.
        </Text>
      ) : (
        <List spacing={3}>
          {projects.map(project => (
            <Box
              key={project.id}
              p={4}
              shadow="md"
              borderWidth="1px"
              borderRadius="md"
              _hover={{ bg: 'gray.50', cursor: 'pointer' }}
              onClick={() => onSelectProject(project)}
            >
              <Heading size="md">{project.name}</Heading>
              <Text mt={2}>{project.folders.length} folders</Text>
              <Text fontSize="sm" color="gray.500">
                Updated: {new Date(project.updatedAt).toLocaleDateString()}
              </Text>
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ProjectList;
