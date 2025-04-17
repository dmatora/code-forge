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

const ApiConfigForm: React.FC<{
  onSave: () => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
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
        setModels(result.models);
        toast({
          title: 'Models refreshed',
          description: `Found ${result.models.length} models`,
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
    <Box p={5}>
      <Heading size="lg" mb={6}>
        API Configuration
      </Heading>

      <VStack spacing={4} align="start">
        <FormControl>
          <FormLabel>API URL</FormLabel>
          <Input
            value={apiUrl}
            onChange={e => setApiUrl(e.target.value)}
            placeholder="Enter API URL (e.g., http://127.1:11434/v1 or https://api.openai.com/v1)"
          />
        </FormControl>

        <FormControl>
          <FormLabel>API Key</FormLabel>
          <Input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter your API key (required for cloud APIs)"
            type="password"
          />
        </FormControl>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text>
            Enter the base URL for your OpenAI-compatible API and your API key. This setting will apply to all projects.
          </Text>
        </Alert>

        {/* Models section */}
        <Box w="full" mt={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="md">Available Models</Heading>
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
            <Box borderWidth="1px" borderRadius="md" p={2}>
              <List spacing={1}>
                {models.map((model, index) => (
                  <ListItem key={index}>
                    {model.name || model.id}
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Box p={4} borderWidth="1px" borderRadius="md">
              {refreshingModels ? (
                <Flex align="center">
                  <Spinner size="sm" mr={2}/>
                  Loading models...
                </Flex>
              ) : (
                <Text>No models available. Configure API URL and click Refresh.</Text>
              )}
            </Box>
          )}
        </Box>

        <Flex w="full" justify="space-between" mt={4}>
          <Button onClick={onCancel} variant="outline">Cancel</Button>
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
