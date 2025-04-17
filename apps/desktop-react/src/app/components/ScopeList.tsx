import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  List,
  ListItem,
  Flex,
  IconButton,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast
} from '@chakra-ui/react';
import { ChevronLeftIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { Project, Scope } from '../types';

const ScopeList: React.FC<{
  project: Project;
  onSelectScope: (scope: Scope) => void;
  onCreateNew: () => void;
  onBack: () => void;
  onEditProject?: () => void;
  onEditScope?: (scope: Scope) => void;
}> = ({ project, onSelectScope, onCreateNew, onBack, onEditScope }) => {
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scopeToDelete, setScopeToDelete] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadScopes();
  }, [project.id]);

  const loadScopes = async () => {
    try {
      const scopes = await window.electron.getScopes(project.id);
      setScopes(scopes);
    } catch (error) {
      console.error('Failed to load scopes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (scope: Scope, e: React.MouseEvent) => {
    e.stopPropagation();
    setScopeToDelete(scope);
    onOpen();
  };

  const confirmDelete = async () => {
    if (!scopeToDelete) return;
    
    try {
      await window.electron.deleteScope(scopeToDelete.id);
      await loadScopes(); // Reload the list
      toast({
        title: 'Scope deleted',
        description: `${scopeToDelete.name} has been removed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete scope',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Failed to delete scope:', error);
    } finally {
      setScopeToDelete(null);
      onClose();
    }
  };

  if (loading) {
    return <Box>Loading scopes...</Box>;
  }

  return (
    <Box>
      <Heading as="h2" size="lg" mb={2}>
        <IconButton
          aria-label="Back to projects"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
          mr={2}
        />
        Project: {project.name}
      </Heading>
      <Text mb={4}>Root folder: {project.rootFolder}</Text>
      <Box mb={6}>
        <Heading as="h3" size="md" mb={2}>Scopes</Heading>
        <Button onClick={onCreateNew} colorScheme="blue">Create New Scope</Button>
      </Box>

      {scopes.length === 0 ? (
        <Box p={4} borderWidth="1px" borderRadius="md">
          No scopes yet. Create your first scope to get started working with this project.
        </Box>
      ) : (
        <List spacing={3}>
          {scopes.map(scope => (
            <ListItem
              key={scope.id}
              p={4}
              shadow="md"
              borderWidth="1px"
              borderRadius="md"
              _hover={{ bg: 'gray.50' }}
            >
              <Flex align="center">
                <Box
                  onClick={() => onSelectScope(scope)}
                  flex="1"
                  cursor="pointer"
                >
                  <Heading as="h3" size="md">{scope.name}</Heading>
                  <Text>{scope.folders.length} folders</Text>
                  <Text fontSize="sm" color="gray.500">
                    Updated: {new Date(scope.updatedAt).toLocaleDateString()}
                  </Text>
                </Box>
                <HStack>
                  {onEditScope && (
                    <IconButton
                      aria-label="Edit scope"
                      icon={<EditIcon />}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditScope(scope);
                      }}
                    />
                  )}
                  <IconButton
                    aria-label="Delete scope"
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={(e) => handleDeleteClick(scope, e)}
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
            Are you sure you want to delete the scope "{scopeToDelete?.name}"? 
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

export default ScopeList;
