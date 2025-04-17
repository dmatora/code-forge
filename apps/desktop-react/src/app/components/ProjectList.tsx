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
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { Project } from '../types';

const ProjectList: React.FC<{
  onSelectProject: (project: Project) => void;
  onCreateNew: () => void;
  onOpenApiConfig: () => void;
  onEditProject?: (project: Project) => void;
}> = ({ onSelectProject, onCreateNew, onOpenApiConfig, onEditProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

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

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    onOpen();
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    
    try {
      await window.electron.deleteProject(projectToDelete.id);
      await loadProjects(); // Reload the list
      toast({
        title: 'Project deleted',
        description: `${projectToDelete.name} has been removed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Failed to delete project:', error);
    } finally {
      setProjectToDelete(null);
      onClose();
    }
  };

  if (loading) {
    return <Box>Loading projects...</Box>;
  }

  return (
    <Box>
      <Box mb={6}>
        <Heading as="h2" size="lg" mb={4}>Your Projects</Heading>
        <HStack>
          <Button onClick={onOpenApiConfig} colorScheme="teal" size="sm">API Settings</Button>
          <Button onClick={onCreateNew} colorScheme="blue">Create New Project</Button>
        </HStack>
      </Box>

      {projects.length === 0 ? (
        <Box p={4} borderWidth="1px" borderRadius="md">
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
                  <Heading as="h3" size="md">{project.name}</Heading>
                  <Text>Root folder: {project.rootFolder}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </Text>
                </Box>
                <HStack>
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
                  <IconButton
                    aria-label="Delete project"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={(e) => handleDeleteClick(project, e)}
                  />
                </HStack>
              </Flex>
            </ListItem>
          ))}
        </List>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Deletion</ModalHeader>
          <ModalBody>
            Are you sure you want to delete the project "{projectToDelete?.name}"? 
            This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="red" onClick={confirmDelete}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProjectList;
