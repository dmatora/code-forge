import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  Checkbox,
  useClipboard,
} from '@chakra-ui/react';
import {
  RepeatIcon,
  ChevronLeftIcon,
  InfoIcon,
  CopyIcon,
} from '@chakra-ui/icons';
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
  onOpenApiConfig,
}) => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [solution, setSolution] = useState('');
  const [scriptResponse, setScriptResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [apiInfo, setApiInfo] = useState<{ url: string; model: string } | null>(
    null
  );
  const [models, setModels] = useState<Model[]>([]);
  const [reasoningModel, setReasoningModel] = useState('');
  const [regularModel, setRegularModel] = useState('');
  const [useTwoStep, setUseTwoStep] = useState(true);
  const [reviewBeforePatch, setReviewBeforePatch] = useState(true);
  const [initialPreferenceLoaded, setInitialPreferenceLoaded] = useState(false);
  const toast = useToast();

  const solutionRef = useRef<HTMLTextAreaElement>(null);
  const fullPromptValue = `${prompt}\n\nContext:\n${context}`;
  const { hasCopied: hasCopiedPrompt, onCopy: onCopyPrompt } =
    useClipboard(fullPromptValue);

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const responseBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const settings = await window.electron.getSettings();
        if (settings && settings.apiUrl) {
          setApiInfo({
            url: settings.apiUrl,
            model: settings.reasoningModel || '',
          });
        }

        if (settings && settings.apiUrl) {
          const modelsList = await window.electron.getModels();
          setModels(modelsList as Model[]);

          if (
            settings.reasoningModel &&
            modelsList.some((m: Model) => m.id === settings.reasoningModel)
          ) {
            setReasoningModel(settings.reasoningModel);
          } else if (modelsList.length > 0) {
            setReasoningModel(modelsList[0].id);
          }

          if (
            settings.regularModel &&
            modelsList.some((m: Model) => m.id === settings.regularModel)
          ) {
            setRegularModel(settings.regularModel);
          } else if (modelsList.length > 0) {
            setRegularModel(modelsList[0].id);
          }

          setInitialPreferenceLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast({
          title: 'Error loading configuration',
          description:
            'Failed to load API configuration. Please check settings.',
          status: 'error',
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
            regularModel,
          });
        } catch (error) {
          console.error('Failed to save model preferences:', error);
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
          title: 'Context refreshed',
          description: 'Project context has been regenerated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Failed to generate context:', error);
        toast({
          title: 'Refresh failed',
          description: 'Failed to regenerate context',
          status: 'error',
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

  const handleGenerateSolution = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      // Step 1: Generate solution
      const solutionResult = await window.electron.generateSolution({
        prompt,
        context,
        model: reasoningModel,
        projectId: project.id,
        scopeId: scope.id,
        reviewBeforePatch: reviewBeforePatch,
      });

      setSolution(solutionResult.solution);

      toast({
        title: 'Solution generated',
        description: `Solution generated in ${solutionResult.processingTime}. ${
          reviewBeforePatch ? 'Review and generate patch.' : ''
        }`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // If auto-proceed is enabled, generate patch immediately
      if (!reviewBeforePatch && useTwoStep) {
        await handleGeneratePatch();
      }
    } catch (error) {
      console.error('API request failed:', error);
      setSolution(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePatch = async () => {
    if (!solution.trim()) {
      toast({
        title: 'Solution required',
        description: 'You need a solution to generate a patch',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setStep2Loading(true);
    try {
      // Step 2: Generate update script
      const scriptResult = await window.electron.generateUpdateScript({
        solution,
        context,
        projectId: project.id,
        scopeId: scope.id,
        model: regularModel,
      });

      setScriptResponse(scriptResult.script);

      toast({
        title: 'Patch generated',
        description: `Update script saved as update.sh in project root folder. Generated in ${scriptResult.processingTime}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Patch generation failed:', error);
      setScriptResponse(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setStep2Loading(false);
    }
  };

  const handleDirectGeneration = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      // One-step process
      const result = await window.electron.generateUpdateScriptDirectly({
        prompt,
        context,
        projectId: project.id,
        scopeId: scope.id,
        model: reasoningModel,
      });

      setSolution(result.response);
      setScriptResponse(result.script);

      toast({
        title: 'Process completed',
        description:
          'Response displayed and saved as update.sh in project root folder.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('API request failed:', error);
      setSolution(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPatchPrompt = () => {
    if (!solution.trim()) {
      toast({
        title: 'No solution',
        description: 'Generate a solution first or enter one manually',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const buildUpdatePrompt = `Could you please provide step-by-step instructions with specific file changes as shell commands, but include all the changes in a single shell block that I can copy and paste into my terminal to apply them all at once? Please ensure that the changes are grouped together and can be executed in one go. Start script from cd command to ensure it runs in correct folder. Don't worry about backup I am using git. Do not use sed or patch - always use cat with EOF as most reliable way to update file. Omit explanations`;
    const promptContent = `${buildUpdatePrompt}\n\n${solution}\n\n${context}`;

    navigator.clipboard
      .writeText(promptContent)
      .then(() => {
        toast({
          title: 'Patch prompt copied',
          description: `Copied to clipboard (${promptContent.length} characters)`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        console.error('Failed to copy prompt:', err);
        toast({
          title: 'Copy failed',
          description: 'Failed to copy to clipboard',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });
  };

  return (
    <Box p={4}>
      <Flex alignItems="center" mb={4}>
        <IconButton
          aria-label="Back"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
          mr={2}
        />
        <Heading size="md">
          Project: {project.name}/ Scope: {scope.name}
        </Heading>
      </Flex>

      {!apiInfo?.url && (
        <Alert status="warning" mb={4}>
          <AlertTitle>API Not Configured</AlertTitle>
          <AlertDescription>
            Please configure the API URL to use automatic patch generation
            {onOpenApiConfig && (
              <Button ml={4} size="sm" onClick={onOpenApiConfig}>
                Configure API
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>Prompt</FormLabel>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            size="md"
            rows={5}
            mb={2}
          />
        </FormControl>

        {/* Two-step process toggle */}
        <Flex alignItems="center" mb={2}>
          <FormLabel htmlFor="two-step-process" mb={0}>
            Use two-step patching process
          </FormLabel>
          <Switch
            id="two-step-process"
            isChecked={useTwoStep}
            onChange={(e) => setUseTwoStep(e.target.checked)}
            mr={2}
          />
          <Tooltip label="When enabled, generates a solution first, then a patch. When disabled, generates a patch directly.">
            <InfoIcon />
          </Tooltip>
        </Flex>

        {/* Review before patch generation toggle */}
        {useTwoStep && (
          <Flex alignItems="center" mb={2}>
            <FormLabel htmlFor="review-before-patch" mb={0}>
              Review solution before generating patch
            </FormLabel>
            <Switch
              id="review-before-patch"
              isChecked={reviewBeforePatch}
              onChange={(e) => setReviewBeforePatch(e.target.checked)}
              mr={2}
            />
          </Flex>
        )}

        {/* Model selection */}
        {apiInfo?.url && models.length > 0 && (
          <HStack spacing={4}>
            <FormControl flex="1">
              <FormLabel>
                {useTwoStep ? 'Reasoning Model (First Prompt)' : 'Model'}
              </FormLabel>
              <Select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name || model.id}
                  </option>
                ))}
              </Select>
            </FormControl>

            {useTwoStep && (
              <FormControl flex="1">
                <FormLabel>Regular Model (Update Script)</FormLabel>
                <Select
                  value={regularModel}
                  onChange={(e) => setRegularModel(e.target.value)}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
          </HStack>
        )}

        <HStack spacing={2}>
          <Button
            leftIcon={<CopyIcon />}
            onClick={onCopyPrompt}
            isDisabled={!prompt.trim() || contextLoading || !context.trim()}
          >
            Copy Full Prompt
          </Button>

          {apiInfo?.url && (
            <>
              {useTwoStep ? (
                <Button
                  colorScheme="blue"
                  onClick={handleGenerateSolution}
                  isLoading={loading}
                  loadingText="Generating..."
                  isDisabled={
                    !prompt.trim() || contextLoading || !context.trim()
                  }
                >
                  Generate Solution
                </Button>
              ) : (
                <Button
                  colorScheme="blue"
                  onClick={handleDirectGeneration}
                  isLoading={loading}
                  loadingText="Generating..."
                  isDisabled={
                    !prompt.trim() || contextLoading || !context.trim()
                  }
                >
                  Generate Patch Directly
                </Button>
              )}
            </>
          )}
        </HStack>

        <Box mt={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="sm">Context</Heading>
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
            <Text>Loading context...</Text>
          ) : (
            <Box bg={bgColor} p={3} borderRadius="md" fontSize="sm">
              {context.length} characters total
            </Box>
          )}
        </Box>

        {/* Solution textarea (editable) */}
        {(useTwoStep || solution) && (
          <Box mt={4}>
            <Flex justify="space-between" align="center" mb={2}>
              <Heading size="sm">
                Solution{useTwoStep ? ' (Step 1)' : ''}
              </Heading>
              {useTwoStep && (
                <Button
                  onClick={copyPatchPrompt}
                  size="sm"
                  leftIcon={<CopyIcon />}
                  isDisabled={!solution.trim()}
                >
                  Copy Patch Prompt
                </Button>
              )}
            </Flex>
            <Textarea
              ref={solutionRef}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Solution will appear here or you can manually enter one..."
              size="md"
              rows={10}
              bg={responseBg}
              mb={2}
            />
            {useTwoStep && (
              <Button
                colorScheme="green"
                onClick={handleGeneratePatch}
                isLoading={step2Loading}
                loadingText="Generating Patch..."
                isDisabled={!solution.trim()}
                mt={2}
              >
                Generate Patch (Step 2)
              </Button>
            )}
          </Box>
        )}

        {/* Script response */}
        {scriptResponse && (
          <Box mt={4}>
            <Heading size="sm" mb={2}>
              Update Script{useTwoStep ? ' (Step 2)' : ''}
            </Heading>
            <Box
              p={4}
              borderRadius="md"
              bg={responseBg}
              whiteSpace="pre-wrap"
              fontFamily="monospace"
            >
              {scriptResponse}
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default PromptInterface;
