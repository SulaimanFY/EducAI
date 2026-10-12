import { Box, Flex, IconButton, Spinner, Text, Textarea } from "@chakra-ui/react";
import { FaPaperPlane } from "react-icons/fa";

const ChatBox = ({
  value,
  onChange,
  showLoginForm = () => {},
  onSubmit,
  isAuthenticated,
  isLoading,
}) => {
  const submit = () => {
    if (!isAuthenticated) {
      showLoginForm();
      return;
    }
    if (value.trim() && !isLoading) {
      onSubmit(value.trim()); // hand the message to the parent page
      onChange("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="2xl"
      boxShadow="0 8px 30px rgba(15, 23, 42, 0.08)"
      p={2}
    >
      <Flex align="flex-end" gap={2}>
        <Textarea
          data-testid="chat-input"
          placeholder="Describe the exercise you need, e.g. 5 questions on addition for Grade 2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          isDisabled={isLoading}
          variant="unstyled"
          resize="none"
          rows={2}
          px={3}
          py={2}
          fontSize="md"
        />
        <IconButton
          data-testid="chat-send"
          aria-label="Send message"
          icon={isLoading ? <Spinner size="sm" /> : <FaPaperPlane />}
          onClick={submit}
          isDisabled={!value.trim() || isLoading}
          borderRadius="xl"
          size="md"
          mb={1}
          mr={1}
        />
      </Flex>
      <Text fontSize="xs" color="gray.400" px={3} pb={1}>
        Press Enter to send, Shift + Enter for a new line
      </Text>
    </Box>
  );
};

export default ChatBox;
