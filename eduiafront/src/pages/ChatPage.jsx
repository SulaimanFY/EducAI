// src/pages/ChatPage.jsx
import { Box, Button, Input, Text, VStack, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import api from "../../api";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data } = await api.post("/chat/", { message: input });
      const botMessage = { role: "bot", content: data.response };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Error sending message", err);
    } finally {
      setIsLoading(false);
    }

    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box p="6" bg="gray.100" h="100%" display="flex" flexDirection="column">
      <VStack spacing="4" flex="1" overflowY="auto">
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            alignSelf={msg.role === "user" ? "flex-end" : "flex-start"}
            bg={msg.role === "user" ? "teal.100" : "gray.200"}
            p="4"
            rounded="md"
            shadow="sm"
            maxW="70%"
          >
            <Text>{msg.content}</Text>
          </Box>
        ))}
        {isLoading && (
          <Box alignSelf="flex-start" p="4">
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.200"
              color="teal.500"
              size="md"
            />
          </Box>
        )}
      </VStack>
      <Box mt="4" display="flex" alignItems="center">
        <Input
          placeholder="Type your message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          mr="4"
          disabled={isLoading}
        />
        <Button
          colorScheme="teal"
          onClick={handleSend}
          isLoading={isLoading}
          loadingText="Sending"
          disabled={isLoading || !input.trim()}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default ChatPage;
