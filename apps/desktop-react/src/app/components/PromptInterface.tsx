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
  useToast
} from '@chakra-ui/react';
import { Project } from '../types';

interface PromptInterfaceProps {
  project: Project;
}

const PromptInterface: React.FC<PromptInterfaceProps> = ({ project }) => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [apiInfo, setApiInfo] = useState<{url: string, model: string} | null>(null);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const responseBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    // Check API configuration
    const checkApiConfig = async () => {
      try {
        const config = await window.electron.getApiConfig();
        setApiInfo(config);
      } catch (error) {
        console.error("Failed to get API config:", error);
      }
    };

    checkApiConfig();
  }, []);

  useEffect(() => {
    // Generate context when project changes
    const generateContext = async () => {
      if (project.folders.length > 0) {
        setContextLoading(true);
        try {
          const content = await window.electron.generateContext(project.folders);
          setContext(content);
        } catch (error) {
          console.error('Failed to generate context:', error);
        } finally {
          setContextLoading(false);
        }
      }
    };

    generateContext();
  }, [project]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const result = await window.electron.sendPrompt({ prompt, context });
      setResponse(result.response || JSON.stringify(result));
    } catch (error) {
      console.error('API request failed:', error);
      setResponse(`Error: ${error.message}`);
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
    <VStack spacing={6} align="stretch">
      <Heading as="h2" size="md">Project: {project.name}</Heading>

      {!apiInfo?.url && (
        <Alert status="warning" mb={4}>
          <AlertTitle>API Not Configured</AlertTitle>
          <AlertDescription>
            Please set the OPENAI_URL environment variable to use automatic patch generation
          </AlertDescription>
        </Alert>
      )}

      <Box>
        <Heading as="h3" size="sm" mb={2}>Prompt</Heading>
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          size="md"
          rows={5}
          mb={2}
        />

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
      </Box>

      <Box>
        <Heading as="h3" size="sm" mb={2}>Context</Heading>
        {contextLoading ? (
          <Box textAlign="center" py={4}>
            <Text>Loading context...</Text>
          </Box>
        ) : (
          <Box
            bg={bgColor}
            p={3}
            borderRadius="md"
            fontSize="sm"
          >
            <Text>{context.length} characters total</Text>
          </Box>
        )}
      </Box>

      {response && (
        <Box>
          <Heading as="h3" size="sm" mb={2}>Response</Heading>
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
    </VStack>
  );
};

export default PromptInterface;
