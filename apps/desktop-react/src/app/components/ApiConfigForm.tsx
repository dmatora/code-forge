import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  useToast,
  Alert,
  AlertIcon,
  Text,
  Flex,
  Spinner,
  List,
  ListItem
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { Model } from '../types/model';

const ApiConfigForm: React.FC<{
  onSave: () => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const loadApiConfig = async () => {
      try {
        const config = await window.electron.getApiConfig();
        if (config) {
          if (config.url) setApiUrl(config.url);
          if (config.key) setApiKey(config.key);
        }

        // Load models
        const modelsList = await window.electron.getModels();
        setModels(modelsList);
      } catch (error) {
        console.error('Failed to load API configuration:', error);
      }
    };

    loadApiConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await window.electron.updateApiConfig({ apiUrl, apiKey });
      if (result.success) {
        // Refresh models list after successful save
        if (apiUrl) {
          const modelsList = await window.electron.getModels();
          setModels(modelsList);
        }

        toast({
          title: 'API configuration saved',
          description: 'The API configuration has been updated successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onSave();
      } else {
        toast({
          title: 'Failed to save API configuration',
          description: result.error || 'An error occurred while updating the API configuration.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to update API configuration:', error);
      toast({
        title: 'Failed to save API configuration',
        description: 'An error occurred while updating the API configuration.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshModels = async () => {
    if (!apiUrl) {
      toast({
        title: 'API URL required',
        description: 'Please enter an API URL first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setRefreshingModels(true);
    try {
      const result = await window.electron.refreshModels({ apiUrl, apiKey });
      if (result.success) {
        setModels(result.models || []);
        toast({
          title: 'Models refreshed',
          description: `Found ${result.models?.length || 0} models`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Failed to refresh models',
          description: result.error || 'An error occurred while fetching models.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to refresh models:', error);
      toast({
        title: 'Failed to refresh models',
        description: 'An error occurred while fetching models from the API.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRefreshingModels(false);
    }
  };

  return (
    <Box maxW="800px" mx="auto" p={4}>
      <Heading as="h1" mb={6}>
        API Configuration
      </Heading>

      <VStack spacing={6} align="stretch">
        <FormControl id="api-url">
          <FormLabel>API URL</FormLabel>
          <Input
            value={apiUrl}
            onChange={e => setApiUrl(e.target.value)}
            placeholder="Enter API URL (e.g., http://127.1:11434/v1 or https://api.openai.com/v1)"
          />
        </FormControl>

        <FormControl id="api-key">
          <FormLabel>API Key</FormLabel>
          <Input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter your API key (required for cloud APIs)"
            type="password"
          />
        </FormControl>

        <Alert status="info">
          <AlertIcon />
          <Text fontSize="sm">
            Enter the base URL for your OpenAI-compatible API and your API key. This setting will apply to all projects.
          </Text>
        </Alert>

        {/* Models section */}
        <Box mt={4}>
          <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Heading as="h3" size="md">
              Available Models
            </Heading>
            <Button
              leftIcon={<RepeatIcon />}
              onClick={handleRefreshModels}
              isLoading={refreshingModels}
              loadingText="Refreshing..."
              size="sm"
              colorScheme="teal"
              isDisabled={!apiUrl}
            >
              Refresh Models
            </Button>
          </Flex>

          {models.length > 0 ? (
            <List spacing={1}>
              {models.map((model, index) => (
                <ListItem key={index} p={2} borderWidth="1px" borderRadius="md">
                  {model.name || model.id}
                </ListItem>
              ))}
            </List>
          ) : (
            <Text color="gray.600">
              {refreshingModels ? (
                <Flex alignItems="center">
                  <Spinner size="sm" mr={2} />
                  Loading models...
                </Flex>
              ) : (
                "No models available. Configure API URL and click Refresh."
              )}
            </Text>
          )}
        </Box>

        <Flex justify="flex-end" mt={6}>
          <Button mr={3} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isLoading={loading}
            loadingText="Saving..."
          >
            Save
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default ApiConfigForm;
