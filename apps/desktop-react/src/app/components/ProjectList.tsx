import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  List,
  ListItem,
  Flex,
  HStack,
  IconButton
} from '@chakra-ui/react';
import { EditIcon } from '@chakra-ui/icons';
import { Project } from '../types';

const ProjectList: React.FC<{
  onSelectProject: (project: Project) => void;
  onCreateNew: () => void;
  onOpenApiConfig: () => void;
  onEditProject?: (project: Project) => void;
}> = ({ onSelectProject, onCreateNew, onOpenApiConfig, onEditProject }) => {
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
      <Box>Loading projects...</Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">Your Projects</Heading>
        <HStack>
          <Button size="sm" onClick={onOpenApiConfig}>API Settings</Button>
          <Button size="sm" colorScheme="blue" onClick={onCreateNew}>Create New Project</Button>
        </HStack>
      </Flex>

      {projects.length === 0 ? (
        <Box p={4} bg="gray.50" borderRadius="md">
          No projects yet. Create your first project to get started.
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
              _hover={{ bg: 'gray.50' }}
            >
              <Flex align="center">
                <Box
                  flex="1"
                  cursor="pointer"
                  onClick={() => onSelectProject(project)}
                >
                  <Text fontWeight="bold">{project.name}</Text>
                  <Text fontSize="sm">Root folder: {project.rootFolder}</Text>
                  <Text fontSize="xs" color="gray.500">
                    Updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </Text>
                </Box>
                {onEditProject && (
                  <IconButton
                    aria-label="Edit project"
                    icon={<EditIcon />}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject(project);
                    }}
                  />
                )}
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ProjectList;
