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
}> = ({ onSelectProject, onCreateNew }) => {
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
      <Box textAlign="center" py={10}>
        <Text mt={4}>Loading projects...</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading as="h2" size="lg">Your Projects</Heading>
        <Button colorScheme="blue" onClick={onCreateNew}>Create New Project</Button>
      </Flex>

      {projects.length === 0 ? (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Text>No projects yet. Create your first project to get started.</Text>
        </Box>
      ) : (
        <List spacing={3}>
          {projects.map(project => (
            <ListItem
              key={project.id}
              p={4}
              shadow="md"
              borderWidth="1px"
              borderRadius="md"
              _hover={{ bg: 'gray.50', cursor: 'pointer' }}
              onClick={() => onSelectProject(project)}
            >
              <Heading as="h3" size="md">{project.name}</Heading>
              <Text mt={2}>{project.folders.length} folders</Text>
              <Text fontSize="sm" color="gray.500">
                Updated: {new Date(project.updatedAt).toLocaleDateString()}
              </Text>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ProjectList;
