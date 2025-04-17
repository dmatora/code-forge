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
} from '@chakra-ui/react'; // Added Divider
import { Divider } from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { Model } from '../types/model';

const ApiConfigForm: React.FC<{
  onSave: () => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [telegramApiKey, setTelegramApiKey] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const loadApiConfig = async () => {
      try {
        const config = await window.electron.getApiConfig();
        if (config) {
          if (config.url) setApiUrl(config.url);
          if (config.key) setApiKey(config.key);
        }

        // Load Telegram config
        const telegramConfig = await window.electron.getTelegramConfig();
        if (telegramConfig) {
          if (telegramConfig.telegramApiKey) setTelegramApiKey(telegramConfig.telegramApiKey);
          if (telegramConfig.telegramChatId) setTelegramChatId(telegramConfig.telegramChatId);
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
      // Save API config and Telegram config in parallel
      const [apiResult, telegramResult] = await Promise.all([
        window.electron.updateApiConfig({ apiUrl, apiKey }),
        window.electron.saveTelegramConfig({ telegramApiKey, telegramChatId })
      ]);

      if (apiResult.success && telegramResult.success) {
        // Refresh models list after successful save
        if (apiUrl) {
          const modelsList = await window.electron.getModels();
          setModels(modelsList);
        }

        toast({
          title: 'Configuration saved',
          description: 'API and Telegram settings have been updated successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onSave();
      } else {
        toast({
          title: 'Failed to save configuration',
          description: apiResult.error || telegramResult.error || 'An error occurred while updating the configuration.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
      toast({
        title: 'Failed to save configuration',
        description: 'An error occurred while updating the configuration.',
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

  const handleTestTelegram = async () => {
    if (!telegramApiKey || !telegramChatId) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both Telegram API Key and Chat ID.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setTestingTelegram(true);
    try {
      const result = await window.electron.testTelegramConfig({ telegramApiKey, telegramChatId });
      toast({
        title: result.success ? 'Telegram Test Successful' : 'Telegram Test Failed',
        description: result.success ? 'A test message was sent successfully.' : result.error || 'An unknown error occurred.',
        status: result.success ? 'success' : 'error',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to test Telegram configuration:', error);
      toast({ title: 'Telegram Test Error', description: 'An unexpected error occurred.', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setTestingTelegram(false);
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

        <Divider my={6} />

        {/* Telegram Configuration */}
        <Heading as="h2" size="lg" mb={4}>
          Telegram Notifications
        </Heading>

        <FormControl id="telegram-api-key">
          <FormLabel>Telegram Bot API Key</FormLabel>
          <Input
            value={telegramApiKey}
            onChange={e => setTelegramApiKey(e.target.value)}
            placeholder="Enter your Telegram Bot API Key"
          />
        </FormControl>

        <FormControl id="telegram-chat-id">
          <FormLabel>Telegram Chat ID</FormLabel>
          <Input
            value={telegramChatId}
            onChange={e => setTelegramChatId(e.target.value)}
            placeholder="Enter the target Chat ID"
          />
        </FormControl>

        <Button
          onClick={handleTestTelegram}
          isLoading={testingTelegram}
          loadingText="Testing..."
          isDisabled={!telegramApiKey || !telegramChatId}
        >Test Telegram</Button>

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
