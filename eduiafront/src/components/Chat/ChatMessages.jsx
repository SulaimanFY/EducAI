import { CopyIcon } from "@chakra-ui/icons";
import { Box, IconButton, Text, useColorModeValue } from "@chakra-ui/react";

const ChatMessages = ({ messages, onCopy }) => {
  const userBgColor = useColorModeValue("blue.50", "blue.900");
  const botBgColor = useColorModeValue("green.50", "green.900");
  
  return (
    <Box 
      w="100%" 
      maxH="60vh" 
      overflowY="auto" 
      mb={4} 
      px={2}
    >
      {messages.map((message, index) => (
        <Box
          key={index}
          bg={message.sender === "user" ? userBgColor : botBgColor}
          p={4}
          borderRadius="lg"
          mb={4}
          position="relative"
          maxW="100%"
        >
          {message.sender === "bot" && (
            <IconButton
              icon={<CopyIcon />}
              size="sm"
              position="absolute"
              top={2}
              right={2}
              aria-label="Copy response"
              onClick={() => onCopy(message.text)}
              variant="ghost"
            />
          )}
          
          {message.sender === "bot" && message.formattedText ? (
            <Box p={2}>{message.formattedText}</Box>
          ) : (
            <Text>{message.text}</Text>
          )}
          
          {message.isError && (
            <Text color="red.500" mt={2} fontStyle="italic">
              Une erreur s'est produite
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ChatMessages;
