// src/pages/Home.jsx
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/Auth/LoginForm";
import ChatBox from "../components/Chat/ChatBox";
import ChatMessages from "../components/Chat/ChatMessages";
import AppLayout from "../components/Layout/AppLayout";
import Navbar from "../components/Layout/Navbar";
import api from "../services/api";

const Home = ({ isAuthenticated, setIsAuthenticated }) => {
  const [canLogin, setCanLogin] = useState(false);
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const showLoginForm = () => {
    setCanLogin((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUsername("");
  };
  const handleHome = () => {
    navigate("/");
  };

  const formatBotResponse = (text) => {
    if (!text) return "";

    const cleanMarkdown = (value) => value.replace(/\*\*/g, "").trim();
    const lines = text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <VStack align="stretch" spacing={3}>
        {lines.map((line, index) => {
          const content = cleanMarkdown(line.replace(/^###\s*/, ""));

          if (line.startsWith("###") || content.startsWith("Titre :")) {
            return (
              <Heading key={index} size="md" color="blue.700" mt={index === 0 ? 0 : 3}>
                {content}
              </Heading>
            );
          }

          if (content.startsWith("Introduction :")) {
            return (
              <Box key={index} p={3} bg="blue.50" borderRadius="md">
                <Text fontWeight="semibold" color="blue.800">
                  {content}
                </Text>
              </Box>
            );
          }

          if (/^Question\s+\d+\s*:/.test(content)) {
            return (
              <Box
                key={index}
                mt={2}
                p={3}
                bg="white"
                borderLeft="4px solid"
                borderColor="blue.400"
                borderRadius="md"
                boxShadow="sm"
              >
                <Text fontWeight="bold" color="gray.800">
                  {content}
                </Text>
              </Box>
            );
          }

          if (/^[A-D]\)/.test(content)) {
            return (
              <Text key={index} pl={5} fontSize="md" color="gray.700">
                {content}
              </Text>
            );
          }

          if (content.startsWith("Réponse correcte")) {
            return (
              <Text
                key={index}
                pl={5}
                color="green.700"
                fontWeight="bold"
                bg="green.50"
                borderRadius="md"
                py={1}
                px={2}
              >
                {content}
              </Text>
            );
          }

          return (
            <Text key={index} whiteSpace="pre-wrap" color="gray.700">
              {content}
            </Text>
          );
        })}
      </VStack>
    );
  };
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log("Text copied to clipboard");
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
      });
  };

  const handleNewMessage = async (userText) => {
    // Reset any previous errors
    setError(null);
    setIsLoading(true);

    try {
      // Ajout du message utilisateur localement
      const userMessage = { sender: "user", text: userText };

      // Add user message immediately for better UX
      setMessages((prev) => [...prev, userMessage]);

      // Appelez l'endpoint /chat/ pour obtenir la réponse
      const response = await api.post("/chat/", { message: userText });
      const botResponse = response.data.response;
      const botMessage = {
        sender: "bot",
        text: botResponse,
        formattedText: formatBotResponse(botResponse)
      };

      // Mise à jour de l'état des messages
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message :", error);
      // Add error message to show to the user
      setError(
        error.response?.data?.detail ||
        "Une erreur s'est produite lors de l'envoi du message. Veuillez réessayer."
      );
      // Add error message as bot response
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Récupération du profil utilisateur pour afficher le nom
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      api
        .get("/me/")
        .then((res) => setUsername(res.data.nom))
        .catch((err) => {
          console.error("Erreur /me :", err);
          setError("Impossible de récupérer votre profil. Veuillez vous reconnecter.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated]);

  return (
    <>
      <Navbar
        isAuthenticated={isAuthenticated}
        onLogin={showLoginForm}
        username={username || "User"}
        onLogout={handleLogout}
        onDashboard={() => navigate("/dashboard")}
        onHome={handleHome}
      />
      <AppLayout>
        <Heading>
          Je suis un assistant IA qui génère des exercices de Maths en fonction du programme scolaire sélectionné.

        </Heading>

        {error && (
          <Box
            bg="red.100"
            color="red.800"
            p={3}
            borderRadius="md"
            mb={4}
            maxW="100%"
          >
            {error}
          </Box>
        )}

        <ChatMessages messages={messages} onCopy={copyToClipboard} />
        <ChatBox
          showLoginForm={showLoginForm}
          onSubmit={handleNewMessage}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        {canLogin && (
          <LoginForm
            showLoginForm={showLoginForm}
            setIsAuthenticated={setIsAuthenticated}
          />
        )}
      </AppLayout>
    </>
  );
};

export default Home;
