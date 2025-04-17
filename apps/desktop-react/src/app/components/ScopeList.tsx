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
  HStack
} from '@chakra-ui/react';
import { ChevronLeftIcon, EditIcon } from '@chakra-ui/icons';
import { Project, Scope } from '../types';

const ScopeList: React.FC<{
  project: Project;
  onSelectScope: (scope: Scope) => void;
  onCreateNew: () => void;
  onBack: () => void;
  onEditProject?: () => void;
  onEditScope?: (scope: Scope) => void;
}> = ({ project, onSelectScope, onCreateNew, onBack, onEditScope }) => {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadScopes();
  }, [project.id]);

  if (loading) {
    return (
      <Box>Loading scopes...</Box>
    );
  }

  return (
    <Box>
      <Flex align="center" mb={2}>
        <IconButton
          aria-label="Back to projects"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
          mr={2}
        />
        <Heading size="lg">Project: {project.name}</Heading>
      </Flex>
      <Text fontSize="sm" mb={4}>
        Root folder: {project.rootFolder}
      </Text>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Scopes</Heading>
        <Button size="sm" colorScheme="blue" onClick={onCreateNew}>Create New Scope</Button>
      </Flex>

      {scopes.length === 0 ? (
        <Box p={4} bg="gray.50" borderRadius="md">
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
                  <Text fontWeight="bold">{scope.name}</Text>
                  <Text fontSize="sm">{scope.folders.length} folders</Text>
                  <Text fontSize="xs" color="gray.500">
                    Updated: {new Date(scope.updatedAt).toLocaleDateString()}
                  </Text>
                </Box>
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
              </Flex>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ScopeList;
