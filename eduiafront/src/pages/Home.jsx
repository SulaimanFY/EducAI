// src/pages/Home.jsx
import { Box, Heading } from "@chakra-ui/react";
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
    
    return text.split(/(\*\*[^*]+\*\*|###[^#\n]+)/).map((part, index) => {
      // Handle exercise titles (###)
      if (part.startsWith("###")) {
        const exerciseText = part.trim();
        return <Heading size="md" color="blue.700" mt={5} mb={3} key={index}>{exerciseText}</Heading>;
      }
      
      // Handle bold text (**)
      if (part.startsWith("**") && part.endsWith("**")) {
        const content = part.slice(2, -2);
        
        if (content.includes("Introduction :")) {
          return <Box as="p" fontWeight="bold" mt={3} mb={3} key={index}>{content}</Box>;
        } else if (content.includes("Question")) {
          return <Box as="p" fontWeight="bold" mt={4} mb={2} key={index}>{content}</Box>;
        } else if (content.includes("Réponse correcte")) {
          return <Box as="p" color="green.600" fontWeight="bold" mt={1} mb={3} key={index}>{content}</Box>;
        } else if (content.includes("Titre :")) {
          return <Heading size="md" mt={4} mb={2} key={index}>{content}</Heading>;
        } else {
          return <Box as="span" fontWeight="bold" key={index}>{content}</Box>;
        }
      }
      return <Box as="span" key={index}>{part}</Box>;
    });
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
          Je suis un assistant IA qui génère des exercices de Math basé sur le
          programme du cycle 2 en France.
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
