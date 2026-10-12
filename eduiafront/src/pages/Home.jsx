// src/pages/Home.jsx
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/Auth/LoginForm";
import ChatBox from "../components/Chat/ChatBox";
import ChatMessages from "../components/Chat/ChatMessages";
import Navbar from "../components/Layout/Navbar";
import api from "../services/api";

const EXAMPLES = [
  "5 questions on addition and subtraction within 100 for Grade 2, set at a zoo",
  "A quiz on 2D shapes for Grade 1",
  "6 questions on doubles, halves and the 2, 5 and 10 times tables for Grade 3",
];

const Home = ({ isAuthenticated, setIsAuthenticated }) => {
  const [canLogin, setCanLogin] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  const showLoginForm = () => {
    setCanLogin((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUsername("");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy text: ", err);
    });
  };

  const handleNewMessage = async (userText) => {
    setError(null);
    setIsLoading(true);
    // Add the user message locally
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);

    try {
      // Call the /chat/ endpoint to get the generated exercise
      const response = await api.post("/chat/", { message: userText });
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: response.data.response,
          exercise: response.data.exercise,
        },
      ]);
    } catch (error) {
      console.error("Error while sending the message:", error);
      setError(
        error.response?.data?.detail ||
          "Something went wrong while sending your message. Please try again."
      );
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I could not process your request. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  // Fetch the user profile to show the teacher's name
  useEffect(() => {
    if (isAuthenticated) {
      api
        .get("/me/")
        .then((res) => setUsername(res.data.nom))
        .catch((err) => {
          console.error("Error on /me:", err);
          setError("Could not load your profile. Please sign in again.");
        });
    }
  }, [isAuthenticated]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar
        isAuthenticated={isAuthenticated}
        onLogin={showLoginForm}
        username={username || "User"}
        onLogout={handleLogout}
        onDashboard={() => navigate("/dashboard")}
        onHome={() => navigate("/")}
      />

      <Container maxW="900px" pt="96px" pb="190px">
        {isEmpty ? (
          <Box textAlign="center" pt={{ base: 6, md: 16 }}>
            <Badge colorScheme="brand" variant="subtle" borderRadius="full" px={3} py={1} mb={5}>
              AI teaching assistant for primary maths
            </Badge>
            <Heading size="2xl" letterSpacing="-0.03em" color="gray.900" mb={4}>
              Create maths exercises that follow your curriculum
            </Heading>
            <Text fontSize="lg" color="gray.600" maxW="640px" mx="auto" mb={8}>
              Ask for a topic, a grade and a number of questions. EducAI writes a
              multiple-choice quiz with its answer key and saves it, ready for marking.
            </Text>
            <Text fontSize="sm" color="gray.500" mb={3}>
              Try one of these
            </Text>
            <Wrap justify="center" spacing={2}>
              {EXAMPLES.map((example) => (
                <WrapItem key={example}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="gray"
                    bg="white"
                    borderRadius="full"
                    fontWeight="500"
                    onClick={() => setDraft(example)}
                  >
                    {example}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        ) : (
          <ChatMessages messages={messages} onCopy={copyToClipboard} isLoading={isLoading} />
        )}

        {error && (
          <Box bg="red.50" color="red.700" p={3} borderRadius="md" mt={4}>
            {error}
          </Box>
        )}
        <div ref={bottomRef} />
      </Container>

      <Box
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        pb={6}
        pt={10}
        bgGradient="linear(to-t, gray.50 65%, transparent)"
      >
        <Container maxW="900px">
          <ChatBox
            value={draft}
            onChange={setDraft}
            showLoginForm={showLoginForm}
            onSubmit={handleNewMessage}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
          />
        </Container>
      </Box>

      <Modal isOpen={canLogin} onClose={showLoginForm} isCentered>
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton zIndex={2} />
          <ModalBody p={0}>
            <LoginForm showLoginForm={showLoginForm} setIsAuthenticated={setIsAuthenticated} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Home;
