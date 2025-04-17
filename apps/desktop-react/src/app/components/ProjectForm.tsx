import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Flex,
  useToast
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
  const [rootFolder, setRootFolder] = useState(project?.rootFolder || '');
  const toast = useToast();

  const handleSelectRootFolder = async () => {
    try {
      const selectedFolder = await window.electron.selectRootFolder();
      if (selectedFolder) {
        setRootFolder(selectedFolder);
      }
    } catch (error) {
      console.error('Failed to select root folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to select root folder',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a project name',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!rootFolder) {
      toast({
        title: 'Root folder required',
        description: 'Please select a root folder for the project',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onSave({ name, rootFolder });
  };

  return (
    <Box>
      <Heading size="lg" mb={4}>
        {project ? 'Edit Project' : 'Create New Project'}
      </Heading>

      <VStack spacing={4} as="form" onSubmit={handleSubmit}>
        <FormControl id="name" isRequired>
          <FormLabel>Project Name</FormLabel>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter project name"
          />
        </FormControl>

        <FormControl id="rootFolder" isRequired>
          <FormLabel>Root Folder</FormLabel>
          <Flex>
            <Input
              value={rootFolder}
              isReadOnly
              placeholder="Select project root folder"
              mr={2}
            />
            <Button onClick={handleSelectRootFolder}>Browse</Button>
          </Flex>
          <Text fontSize="xs" color="gray.500" mt={1}>
            This is where update.sh will be stored
          </Text>
        </FormControl>

        <Flex width="100%" justify="space-between" mt={4}>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button colorScheme="blue" type="submit">Save Project</Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default ProjectForm;
