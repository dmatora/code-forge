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
    const loadConfig = async () => {
      try {
        const settings = await window.electron.getSettings();
        if (settings) {
          if (settings.apiUrl) setApiUrl(settings.apiUrl);
          if (settings.apiKey) setApiKey(settings.apiKey);
          if (settings.telegramApiKey) setTelegramApiKey(settings.telegramApiKey);
          if (settings.telegramChatId) setTelegramChatId(settings.telegramChatId);
        }

        const modelsList = await window.electron.getModels();
        setModels(modelsList as Model[]);
      } catch (error) {
        console.error('Failed to load configuration:', error);
        toast({
          title: 'Error',
          description: 'Failed to load configuration. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await window.electron.updateSettings({
        apiUrl,
        apiKey,
        telegramApiKey,
        telegramChatId
      });

      if (apiUrl) {
        const modelsList = await window.electron.getModels();
        setModels(modelsList as Model[]);
      }

      toast({
        title: 'Configuration saved',
        description: 'All settings have been updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onSave();
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
        setModels(result.models as Model[] || []);
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
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
      <Heading size="lg" mb={6}>
        API Configuration
      </Heading>

      <VStack spacing={4} align="stretch">
        <FormControl id="apiUrl">
          <FormLabel>API URL</FormLabel>
          <Input
            value={apiUrl}
            onChange={e => setApiUrl(e.target.value)}
            placeholder="Enter API URL (e.g., http://127.1:11434/v1 or https://api.openai.com/v1)"
          />
        </FormControl>

        <FormControl id="apiKey">
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
          <Text fontSize="sm">
            Enter the base URL for your OpenAI-compatible API and your API key. This setting will apply to all projects.
          </Text>
        </Alert>

        <Divider />

        <Heading size="md" mt={2}>
          Telegram Notifications
        </Heading>

        <FormControl id="telegramApiKey">
          <FormLabel>Telegram Bot API Key</FormLabel>
          <Input
            value={telegramApiKey}
            onChange={e => setTelegramApiKey(e.target.value)}
            placeholder="Enter your Telegram Bot API Key"
          />
        </FormControl>

        <FormControl id="telegramChatId">
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

        <Box mt={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="sm">
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
                <ListItem key={index}>
                  {model.name || model.id}
                </ListItem>
              ))}
            </List>
          ) : (
            <Text fontSize="sm" color="gray.600">
              {refreshingModels ? (
                <Flex align="center">
                  <Spinner size="sm" mr={2} />
                  Loading models...
                </Flex>
              ) : (
                "No models available. Configure API URL and click Refresh."
              )}
            </Text>
          )}
        </Box>

        <Flex justify="flex-end" mt={4}>
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
