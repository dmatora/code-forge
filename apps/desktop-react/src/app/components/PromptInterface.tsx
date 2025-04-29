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
  const [useTwoStep, setUseTwoStep] = useState(true);
  const [initialPreferenceLoaded, setInitialPreferenceLoaded] = useState(false);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const responseBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const settings = await window.electron.getSettings();
        if (settings && settings.apiUrl) {
          setApiInfo({ url: settings.apiUrl, model: settings.reasoningModel || '' });
        }

        if (settings && settings.apiUrl) {
          const modelsList = await window.electron.getModels();
          setModels(modelsList as Model[]);

          if (settings.reasoningModel && modelsList.some((m: Model) => m.id === settings.reasoningModel)) {
            setReasoningModel(settings.reasoningModel);
          } else if (modelsList.length > 0) {
            setReasoningModel(modelsList[0].id);
          }

          if (settings.regularModel && modelsList.some((m: Model) => m.id === settings.regularModel)) {
            setRegularModel(settings.regularModel);
          } else if (modelsList.length > 0) {
            setRegularModel(modelsList[0].id);
          }

          setInitialPreferenceLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast({
          title: "Error loading configuration",
          description: "Failed to load API configuration. Please check settings.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!initialPreferenceLoaded) return;

    const savePreferences = async () => {
      if (reasoningModel && regularModel) {
        try {
          await window.electron.updateSettings({
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
        <Heading size="md">
          Project: {project.name}
          / Scope: {scope.name}
        </Heading>
      </Flex>

      {!apiInfo?.url && (
        <Alert status="warning" mb={4}>
          <AlertTitle>API Not Configured</AlertTitle>
          <AlertDescription>
            Please configure the API URL to use automatic patch generation
            {onOpenApiConfig && (
              <Button ml={2} size="sm" onClick={onOpenApiConfig}>Configure API</Button>
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
        <Flex align="center" mb={2}>
          <FormLabel htmlFor="two-step-process" mb={0}>
            Use two-step patching process
          </FormLabel>
          <Switch
            id="two-step-process"
            isChecked={useTwoStep}
            onChange={(e) => setUseTwoStep(e.target.checked)}
            mr={2}
          />
          <Tooltip label="When enabled, uses two AI calls: first to analyze your request, then to generate the shell script. This produces better explanations but takes longer.">
            <InfoIcon color="blue.500" />
          </Tooltip>
        </Flex>

        {/* Only show model selection when API URL is configured */}
        {apiInfo?.url && models.length > 0 && (
          <HStack spacing={4}>
            <FormControl>
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
              <FormControl>
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

      <Box mt={8}>
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
          <Text>
            Loading context...
          </Text>
        ) : (
          <Text
            bg={bgColor}
            p={3}
            borderRadius="md"
            fontSize="sm"
          >
            {context.length} characters total
          </Text>
        )}
      </Box>

      {response && (
        <VStack align="stretch" mt={8} spacing={2}>
          <Heading size="sm">
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
        </VStack>
      )}
    </Box>
  );
};

export default PromptInterface;
