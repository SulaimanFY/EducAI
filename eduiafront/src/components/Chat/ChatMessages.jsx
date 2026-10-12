import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";

const ExerciseCard = ({ exercise }) => (
  <Box data-testid="exercise-card">
    <HStack spacing={2} mb={2}>
      <Badge colorScheme="brand" variant="subtle" borderRadius="md" px={2}>
        Exercise #{exercise.id}
      </Badge>
      <Badge colorScheme="gray" variant="subtle" borderRadius="md" px={2}>
        {exercise.questions.length} questions
      </Badge>
    </HStack>
    <Heading size="md" color="gray.900" mb={2} pr={10}>
      {exercise.title}
    </Heading>
    {exercise.intro && (
      <Text color="gray.600" mb={4}>
        {exercise.intro}
      </Text>
    )}
    <VStack align="stretch" spacing={3}>
      {exercise.questions.map((question, index) => (
        <Box
          key={question.id}
          data-testid="exercise-question"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          p={4}
          bg="white"
        >
          <Text fontWeight="600" color="gray.900" mb={3}>
            <Box as="span" color="brand.500" mr={2}>
              {index + 1}.
            </Box>
            {question.text}
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
            {question.options.map((option) => (
              <Flex
                key={option.letter}
                align="center"
                gap={3}
                px={3}
                py={2}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={option.correct ? "green.300" : "gray.100"}
                bg={option.correct ? "green.50" : "gray.50"}
              >
                <Flex
                  w="24px"
                  h="24px"
                  flexShrink={0}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  fontSize="xs"
                  fontWeight="700"
                  bg={option.correct ? "green.500" : "white"}
                  color={option.correct ? "white" : "gray.600"}
                  borderWidth={option.correct ? 0 : "1px"}
                  borderColor="gray.200"
                >
                  {option.correct ? <CheckIcon boxSize={2.5} /> : option.letter}
                </Flex>
                <Text fontSize="sm" color={option.correct ? "green.800" : "gray.700"} fontWeight={option.correct ? "600" : "400"}>
                  {option.correct ? `${option.letter}) ${option.text}` : option.text}
                </Text>
              </Flex>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
    <Text fontSize="sm" color="gray.500" mt={4}>
      Answer key saved. Pupils' answer sheets for exercise #{exercise.id} can now be marked from the dashboard.
    </Text>
  </Box>
);

const ChatMessages = ({ messages, onCopy, isLoading }) => (
  <VStack align="stretch" spacing={5} w="100%">
    {messages.map((message, index) =>
      message.sender === "user" ? (
        <Flex key={index} justify="flex-end">
          <Box
            data-testid="user-message"
            bg="brand.500"
            color="white"
            px={4}
            py={3}
            borderRadius="2xl"
            borderBottomRightRadius="md"
            maxW="80%"
          >
            <Text>{message.text}</Text>
          </Box>
        </Flex>
      ) : (
        <Box
          key={index}
          bg="white"
          borderWidth="1px"
          borderColor={message.isError ? "red.200" : "gray.200"}
          borderRadius="2xl"
          borderTopLeftRadius="md"
          boxShadow="sm"
          p={{ base: 4, md: 6 }}
          position="relative"
        >
          {!message.isError && (
            <Tooltip label="Copy as text">
              <IconButton
                icon={<CopyIcon />}
                size="sm"
                position="absolute"
                top={3}
                right={3}
                aria-label="Copy response"
                onClick={() => onCopy(message.text)}
                variant="ghost"
                colorScheme="gray"
              />
            </Tooltip>
          )}
          {message.exercise ? (
            <ExerciseCard exercise={message.exercise} />
          ) : (
            <Text whiteSpace="pre-wrap" color={message.isError ? "red.600" : "gray.700"} pr={8}>
              {message.text}
            </Text>
          )}
        </Box>
      )
    )}
    {isLoading && (
      <Box
        data-testid="bot-loading"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="2xl"
        borderTopLeftRadius="md"
        p={5}
        w="fit-content"
      >
        <HStack spacing={3}>
          <Spinner size="sm" color="brand.500" />
          <Text color="gray.600">Writing your exercise and its answer key...</Text>
        </HStack>
      </Box>
    )}
  </VStack>
);

export default ChatMessages;
