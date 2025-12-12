import { Flex, IconButton, InputGroup, Textarea, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

const ChatBox = ({ showLoginForm = () => { }, onSubmit, isAuthenticated, isLoading }) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue); // <-- C'est ici qu'on appelle la fonction parent
      setInputValue(""); // Clear input field after submission
    }
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      showLoginForm();
    } else {
      handleSubmit();
    }
  };

  return (
    <Flex as="form" mt="4" width="container.lg" position="relative">
      <InputGroup size="md">
        <Textarea
          placeholder="Posez-moi vos questions"
          value={inputValue}
          onChange={handleInputChange}
          pr="3rem"
          disabled={isLoading}
        />
        {isLoading ? (
          <Spinner
            position="absolute"
            bottom="12px"
            right="12px"
            size="sm"
            color="teal.500"
          />
        ) : (
          <IconButton
            aria-label="Send message"
            icon={<FaPaperPlane />}
            colorScheme="teal"
            onClick={handleButtonClick}
            isDisabled={!inputValue.trim() || isLoading}
            position="absolute"
            bottom="8px"
            right="8px"
            size="sm"
            cursor="pointer"
            zIndex="50"
          />
        )}
      </InputGroup>
    </Flex>
  );
};

export default ChatBox;
