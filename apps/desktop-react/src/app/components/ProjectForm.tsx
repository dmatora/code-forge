import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Heading,
  List,
  ListItem,
  Flex,
  Textarea,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure
} from '@chakra-ui/react';
import { Project } from '../types';

interface ProjectFormProps {
  project?: Project;
  onSave: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(project?.name || '');
  const [folders, setFolders] = useState(project?.folders || []);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [bulkPaths, setBulkPaths] = useState('');
  const toast = useToast();

  const handleSelectFolders = async () => {
    try {
      const selectedFolders = await window.electron.selectFolders();
      if (selectedFolders && selectedFolders.length > 0) {
        setFolders(prev => [...prev, ...selectedFolders]);
      }
    } catch (error) {
      console.error('Failed to select folders:', error);
    }
  };

  const handleRemoveFolder = (index: number) => {
    setFolders(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, folders });
  };

  const handleBulkPathsSubmit = () => {
    try {
      // Try to parse as JSON first if it looks like JSON
      let newPaths = [];
      const trimmedInput = bulkPaths.trim();
      
      if (trimmedInput.startsWith('[') && trimmedInput.endsWith(']')) {
        try {
          // Parse as JSON array
          newPaths = JSON.parse(trimmedInput);
          if (!Array.isArray(newPaths)) {
            throw new Error('Parsed result is not an array');
          }
        } catch (error) {
          console.error('JSON parse error:', error);
          // Fall back to line-by-line parsing
          newPaths = trimmedInput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('[') && !line.endsWith(']'));
        }
      } else {
        // Split by newlines
        newPaths = trimmedInput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line);
      }
      
      // Filter out any non-string values
      newPaths = newPaths.filter(path => typeof path === 'string' && path.length > 0);
      
      if (newPaths.length === 0) {
        toast({
          title: 'No valid paths found',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Add new paths and remove duplicates
      const uniquePaths = [...new Set([...folders, ...newPaths])];
      setFolders(uniquePaths);
      
      toast({
        title: 'Paths added',
        description: `Added ${uniquePaths.length - folders.length} new paths`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
      setBulkPaths('');
    } catch (error) {
      toast({
        title: 'Failed to parse paths',
        description: error instanceof Error ? error.message : String(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>
        {project ? 'Edit Project' : 'Create New Project'}
      </Heading>

      <VStack as="form" spacing={4} onSubmit={handleSubmit} align="stretch">
        <FormControl isRequired>
          <FormLabel>Project Name</FormLabel>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter project name"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Folders</FormLabel>
          <HStack spacing={2} mb={3}>
            <Button
              colorScheme="blue"
              onClick={handleSelectFolders}
            >
              Add Folders
            </Button>
            <Button
              colorScheme="teal"
              onClick={onOpen}
            >
              Paste Multiple Paths
            </Button>
          </HStack>

          {folders.length > 0 && (
            <List spacing={2}>
              {folders.map((folder, index) => (
                <ListItem
                  key={index}
                  p={2}
                  bg="gray.50"
                  borderRadius="md"
                >
                  <Flex justify="space-between" align="center">
                    {folder}
                    <Button
                      size="sm"
                      onClick={() => handleRemoveFolder(index)}
                    >
                      ✕
                    </Button>
                  </Flex>
                </ListItem>
              ))}
            </List>
          )}
        </FormControl>

        <HStack spacing={4} pt={4}>
          <Button colorScheme="blue" type="submit">Save</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </HStack>
      </VStack>
      
      {/* Modal for pasting multiple paths */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Paste Multiple Paths</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Paste paths (one per line or as JSON array)</FormLabel>
              <Textarea 
                value={bulkPaths}
                onChange={(e) => setBulkPaths(e.target.value)}
                placeholder="/path/to/folder1
/path/to/folder2
/path/to/folder3"
                rows={10}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleBulkPathsSubmit}>
              Add Paths
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProjectForm;
