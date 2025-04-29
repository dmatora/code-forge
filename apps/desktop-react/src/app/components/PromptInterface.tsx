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
  Flex,
  IconButton,
  Switch,
  Tooltip
} from '@chakra-ui/react';
import { RepeatIcon, ChevronLeftIcon, InfoIcon } from '@chakra-ui/icons';
import { Project, Scope } from '../types';
import { Model } from '../types/model';

interface PromptInterfaceProps {
  project: Project;
  scope: Scope;
  onBack: () => void;
  onOpenApiConfig?: () => void;
}

const PromptInterface: React.FC<PromptInterfaceProps> = ({
  project,
  scope,
  onBack,
  onOpenApiConfig
}) => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [apiInfo, setApiInfo] = useState<{url: string, model: string} | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [reasoningModel, setReasoningModel] = useState('');
  const [regularModel, setRegularModel] = useState('');
  const [useTwoStep, setUseTwoStep] = useState(true); // Default to two-step process
  const [initialPreferenceLoaded, setInitialPreferenceLoaded] = useState(false);
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

          // Mark that we've loaded the initial preferences
          setInitialPreferenceLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };

    loadInitialData();
  }, []);

  // Save preferences when models change, but only after initial load and when actually changed
  useEffect(() => {
    // Skip if this is the initial load of preferences
    if (!initialPreferenceLoaded) return;

    const savePreferences = async () => {
      if (reasoningModel && regularModel) {
        try {
          // Get current preferences first
          const currentPreferences = await window.electron.getPreferences();

          // Only save if something changed
          if (currentPreferences.reasoningModel !== reasoningModel ||
              currentPreferences.regularModel !== regularModel) {
            await window.electron.saveModelPreferences({
              reasoningModel,
              regularModel
            });
          }
        } catch (error) {
          console.error("Failed to save model preferences:", error);
        }
      }
    };

    if (reasoningModel && regularModel) {
      savePreferences();
    }
  }, [reasoningModel, regularModel, initialPreferenceLoaded]);

  // Extract the context generation logic into a separate function
  const regenerateContext = async () => {
    if (scope.folders.length > 0) {
      setContextLoading(true);
      try {
        const content = await window.electron.generateContext(scope.folders);
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
    // Generate context when scope changes
    regenerateContext();
  }, [scope]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const result = await window.electron.sendPrompt({
        prompt,
        context,
        projectId: project.id,
        scopeId: scope.id,
        reasoningModel,
        regularModel,
        useTwoStep
      });
      setResponse(result.response || JSON.stringify(result));
      toast({
        title: "Process completed",
        description: useTwoStep ?
          "First response displayed. Second response saved as update.sh in project root folder." :
          "Response saved as update.sh in project root folder.",
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
    let fullPrompt: string;

    if (useTwoStep) {
      // Two-step process: Copy prompt + context as is
      fullPrompt = `${prompt}\n\nContext:\n${context}`;
    } else {
      // One-step process: Use the same instruction as in api.service.ts
      const oneStepInstruction = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations.`;
      fullPrompt = `${oneStepInstruction}\n\nHere is my request:\n${prompt}\n\nHere is the context:\n${context}`;
    }

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
    <Box>
      <Flex align="center" mb={4}>
        <IconButton
          aria-label="Back"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
          mr={2}
        />
        <Box>
          <Heading size="md">Project: {project.name}</Heading>
          <Text>/ Scope: {scope.name}</Text>
        </Box>
      </Flex>

      {!apiInfo?.url && (
        <Alert status="warning" mb={4}>
          <AlertTitle>API Not Configured</AlertTitle>
          <AlertDescription>
            Please configure the API URL to use automatic patch generation
            {onOpenApiConfig && (
              <Button colorScheme="blue" ml={4} onClick={onOpenApiConfig}>Configure API</Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <VStack spacing={4} align="stretch">
        <FormControl>
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

        {/* Add the checkbox for two-step process toggle */}
        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="two-step-process" mb="0">
            Use two-step patching process
          </FormLabel>
          <Switch
            id="two-step-process"
            isChecked={useTwoStep}
            onChange={(e) => setUseTwoStep(e.target.checked)}
            mr={2}
          />
          <Tooltip label="Two-step process generates a detailed solution first, then creates the update script. One-step process creates the update script directly (faster but may be less accurate for complex tasks).">
            <InfoIcon color="gray.500" />
          </Tooltip>
        </FormControl>

        {/* Only show model selection when API URL is configured */}
        {apiInfo?.url && models.length > 0 && (
          <HStack spacing={4} wrap="wrap">
            <FormControl flex="1" minW="250px">
              <FormLabel>
                {useTwoStep ? "Reasoning Model (First Prompt)" : "Model"}
              </FormLabel>
              <Select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name || model.id}
                  </option>
                ))}
              </Select>
            </FormControl>

            {useTwoStep && (
              <FormControl flex="1" minW="250px">
                <FormLabel>Regular Model (Update Script)</FormLabel>
                <Select
                  value={regularModel}
                  onChange={(e) => setRegularModel(e.target.value)}
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
          </HStack>
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
      </VStack>

      <Box mt={6}>
        <Flex justify="space-between" align="center" mb={2}>
          <Heading size="sm">
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
          <Text py={4}>
            Loading context...
          </Text>
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
        <Box mt={6}>
          <Heading size="sm" mb={2}>
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
