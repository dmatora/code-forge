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
  Text
} from '@chakra-ui/react';

const ApiConfigForm: React.FC<{
  onSave: () => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const loadApiConfig = async () => {
      try {
        const config = await window.electron.getApiConfig();
        if (config) {
          if (config.url) setApiUrl(config.url);
          if (config.key) setApiKey(config.key);
        }
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

  return (
    <Box p={5}>
      <Heading as="h2" size="lg" mb={6}>
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

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            Enter the base URL for your OpenAI-compatible API and your API key. This setting will apply to all projects.
          </Box>
        </Alert>

        <Box display="flex" justifyContent="flex-end">
          <Button variant="outline" onClick={onCancel} mr={3}>
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
        </Box>
      </VStack>
    </Box>
  );
};

export default ApiConfigForm;
