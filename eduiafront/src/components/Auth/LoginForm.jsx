import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Stack,
  Text,
  useColorModeValue
} from "@chakra-ui/react";
import { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const LoginForm = ({ showLoginForm = () => {}, setIsAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("email", email);
      formData.append("password", password);

      const response = await api.post("/login/", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const token = response.data.access_token;
      localStorage.setItem("token", token);
      setIsAuthenticated(true);
      navigate("/");
      showLoginForm();
    } catch (error) {
      console.error("Login failed:", error.response?.data || error.message);
      setError("Email ou mot de passe incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  const bgColor = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "white");

  return (
    <Flex
      minH={{ base: "auto", md: "400px" }}
      align="center"
      justify="center"
      w="100%"
    >
      <Box 
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
        p={{ base: 6, md: 8 }}
        w={{ base: "90%", sm: "450px" }}
        maxW="100%"
      >
        <Stack spacing={6}>
          <Heading 
            fontSize="2xl" 
            textAlign="center" 
            color={textColor}
            mb={2}
          >
            Bienvenue
          </Heading>
          <Text fontSize="md" color="gray.500" textAlign="center" mt={-4}>
            Connectez-vous à votre compte
          </Text>
          
          {error && (
            <Text 
              color="red.500" 
              bg="red.50" 
              p={3} 
              borderRadius="md" 
              fontSize="sm" 
              textAlign="center"
            >
              {error}
            </Text>
          )}
          
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl id="email" isRequired>
                <FormLabel fontSize="sm">Email</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FaEnvelope color="gray.300" />
                  </InputLeftElement>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    autoComplete="email"
                    size="md"
                    borderRadius="md"
                    focusBorderColor="blue.400"
                  />
                </InputGroup>
              </FormControl>
              
              <FormControl id="password" isRequired>
                <FormLabel fontSize="sm">Mot de passe</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FaLock color="gray.300" />
                  </InputLeftElement>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    size="md"
                    borderRadius="md"
                    focusBorderColor="blue.400"
                  />
                </InputGroup>
              </FormControl>
              
              <Stack spacing={4} pt={4}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  fontSize="md"
                  isLoading={isLoading}
                  loadingText="Connexion en cours..."
                  borderRadius="md"
                  _hover={{
                    transform: "translateY(-2px)",
                    boxShadow: "md",
                  }}
                  transition="all 0.2s"
                >
                  Se connecter
                </Button>
                
                <Link 
                  href="/register" 
                  textAlign="center" 
                  color="blue.500" 
                  _hover={{ textDecoration: "none", color: "blue.600" }}
                  fontWeight="medium"
                  fontSize="md"
                  mt={2}
                >
                  Créer mon compte
                </Link>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Flex>
  );
};

export default LoginForm;
