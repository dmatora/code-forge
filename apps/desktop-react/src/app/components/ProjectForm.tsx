import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  List,
  ListItem,
  Flex,
  HStack
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
  const [folders, setFolders] = useState<string[]>(project?.folders || []);

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

  return (
    <Box as="form" onSubmit={handleSubmit} p={5} shadow="md" borderWidth="1px" borderRadius="md">
      <Heading as="h2" size="lg" mb={6}>
        {project ? 'Edit Project' : 'Create New Project'}
      </Heading>

      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel htmlFor="name">Project Name</FormLabel>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter project name"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Folders</FormLabel>
          <Button
            colorScheme="blue"
            mb={4}
            onClick={handleSelectFolders}
          >
            Add Folders
          </Button>

          {folders.length > 0 && (
            <List spacing={2}>
              {folders.map((folder, index) => (
                <ListItem key={index}>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Box as="span" isTruncated>{folder}</Box>
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

        <HStack spacing={4} mt={4}>
          <Button type="submit" colorScheme="blue">Save</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default ProjectForm;
