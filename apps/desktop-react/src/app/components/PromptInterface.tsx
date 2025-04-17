import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Textarea,
  Text,
  VStack,
  Alert,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  useToast,
  Select,
  FormControl,
  FormLabel,
  HStack,
  Flex
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { Project } from '../types';

interface PromptInterfaceProps {
  project: Project;
  onOpenApiConfig?: () => void; // Add this prop
}

const PromptInterface: React.FC<PromptInterfaceProps> = ({ project, onOpenApiConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [apiInfo, setApiInfo] = useState<{url: string, model: string} | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [reasoningModel, setReasoningModel] = useState('');
  const [regularModel, setRegularModel] = useState('');
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const responseBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    // Load API configuration and models
    const loadInitialData = async () => {
      try {
        // Get API config
        const config = await window.electron.getApiConfig();
        setApiInfo(config);

        // Only fetch models if API URL is configured
        if (config && config.url) {
          // Get available models
          const modelsList = await window.electron.getModels();
          setModels(modelsList);

          // Get saved preferences
          const preferences = await window.electron.getPreferences();

          // Set model values based on preferences, falling back to config defaults
          if (preferences.reasoningModel && modelsList.some((m: {id: string}) => m.id === preferences.reasoningModel)) {
            setReasoningModel(preferences.reasoningModel);
          } else if (config?.model && modelsList.some((m: {id: string}) => m.id === config.model)) {
            setReasoningModel(config.model);
          } else if (modelsList.length > 0) {
            setReasoningModel(modelsList[0].id);
          }

          if (preferences.regularModel && modelsList.some((m: {id: string}) => m.id === preferences.regularModel)) {
            setRegularModel(preferences.regularModel);
          } else if (config?.model && modelsList.some((m: {id: string}) => m.id === config.model)) {
            setRegularModel(config.model);
          } else if (modelsList.length > 0) {
            setRegularModel(modelsList[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };

    loadInitialData();
  }, []);

  // Save preferences when models change
  useEffect(() => {
    const savePreferences = async () => {
      if (reasoningModel && regularModel) {
        try {
          await window.electron.saveModelPreferences({
            reasoningModel,
            regularModel
          });
        } catch (error) {
          console.error("Failed to save model preferences:", error);
        }
      }
    };

    if (reasoningModel && regularModel) {
      savePreferences();
    }
  }, [reasoningModel, regularModel]);

  // Extract the context generation logic into a separate function
  const regenerateContext = async () => {
    if (project.folders.length > 0) {
      setContextLoading(true);
      try {
        const content = await window.electron.generateContext(project.folders);
        setContext(content);
        toast({
          title: "Context refreshed",
          description: "Project context has been regenerated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Failed to generate context:', error);
        toast({
          title: "Refresh failed",
          description: "Failed to regenerate context",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setContextLoading(false);
      }
    }
  };

  useEffect(() => {
    // Generate context when project changes
    regenerateContext();
  }, [project]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const result = await window.electron.sendPrompt({
        prompt,
        context,
        projectFolders: project.folders,
        reasoningModel,
        regularModel
      });
      setResponse(result.response || JSON.stringify(result));
      toast({
        title: "Process completed",
        description: "First response displayed. Second response saved as update.sh",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('API request failed:', error);
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    const fullPrompt = `${prompt}\n\nContext:\n${context}`;
    navigator.clipboard.writeText(fullPrompt).then(() => {
      toast({
        title: "Prompt copied",
        description: `Copied to clipboard (${fullPrompt.length} characters)`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }).catch(err => {
      console.error('Failed to copy prompt:', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    });
  };

  return (
    <Box p={5}>
      <Heading size="lg" mb={6}>
        Project: {project.name}
      </Heading>

      {!apiInfo?.url && (
        <Alert status="warning" mb={4}>
          <AlertTitle>API Not Configured</AlertTitle>
          <AlertDescription>
            Please configure the API URL to use automatic patch generation
            {onOpenApiConfig && (
              <Button size="sm" colorScheme="blue" ml={4} onClick={onOpenApiConfig}>Configure API</Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Box mb={6}>
        <FormControl mb={4}>
          <FormLabel>Prompt</FormLabel>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            size="md"
            rows={5}
            mb={2}
          />
        </FormControl>

        {/* Only show model selection when API URL is configured */}
        {apiInfo?.url && models.length > 0 && (
          <Flex gap={4} mb={4}>
            <FormControl>
              <FormLabel>Reasoning Model (First Prompt)</FormLabel>
              <Select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Regular Model (Update Script)</FormLabel>
              <Select
                value={regularModel}
                onChange={(e) => setRegularModel(e.target.value)}
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Flex>
        )}

        <Flex>
          <Button
            mr={2}
            onClick={handleCopyPrompt}
            isDisabled={!prompt.trim() || contextLoading || !context.trim()}
          >
            Copy Full Prompt ({prompt.length + context.length} characters)
          </Button>

          {apiInfo?.url && (
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={loading}
              loadingText="Sending..."
              isDisabled={!prompt.trim() || contextLoading || !context.trim()}
            >
              Send
            </Button>
          )}
        </Flex>
      </Box>

      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={2}>
          <Heading size="md">
            Context
          </Heading>
          <Button
            leftIcon={<RepeatIcon />}
            onClick={regenerateContext}
            isLoading={contextLoading}
            loadingText="Refreshing..."
            colorScheme="teal"
            size="sm"
          >
            Refresh Context
          </Button>
        </Flex>
        {contextLoading ? (
          <Box p={3}>
            Loading context...
          </Box>
        ) : (
          <Box
            bg={bgColor}
            p={3}
            borderRadius="md"
            fontSize="sm"
          >
            {context.length} characters total
          </Box>
        )}
      </Box>

      {response && (
        <Box mb={6}>
          <Heading size="md" mb={2}>
            Response
          </Heading>
          <Box
            bg={responseBg}
            p={4}
            borderRadius="md"
            whiteSpace="pre-wrap"
          >
            {response}
            </Box>
       </Box>
     )}
   </Box>
 );
};

export default PromptInterface;
