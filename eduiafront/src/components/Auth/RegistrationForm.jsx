import {
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
// src/components/Auth/RegistrationForm.jsx
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useState } from "react";
import api from "../../services/api";

const RegistrationForm = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const toast = useToast();

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.nom.trim()) {
      newErrors.nom = "Name is required";
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    // Clear field-specific error when user types
    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  const onRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // Register the user
      const response = await api.post("/register/", {
        nom: formData.nom,
        email: formData.email,  
        mot_de_passe: formData.password,
      });

      toast({
        title: "Account created",
        description: response.data.message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Auto login after registration
      // Modified: Using "email" instead of "username" to match server expectations
      const loginFormData = new URLSearchParams();
      loginFormData.append("email", formData.email); // Changed from "username" to "email"
      loginFormData.append("password", formData.password);

      try {
        const loginResponse = await api.post("/login/", loginFormData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (loginResponse.data.access_token) {
          const token = loginResponse.data.access_token;
          localStorage.setItem("token", token);
          setIsAuthenticated(true);
          window.location.replace("/");
        }
      } catch (loginError) {
        console.error("Auto-login failed:", loginError);
        toast({
          title: "Account created, but automatic sign-in failed",
          description: "Please sign in manually.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        // Redirect to login page instead
        window.location.replace("/login");
      }
    } catch (e) {
      console.error("Registration failed:", e);
      
      // Improved error handling to safely parse and display server errors
      let errorMessage = "Registration failed. Please check your details.";
      
      if (e.response?.data) {
        if (typeof e.response.data.detail === 'string') {
          errorMessage = e.response.data.detail;
        } else if (Array.isArray(e.response.data.detail)) {
          // Handle array of validation errors
          errorMessage = e.response.data.detail
            .map(err => `${err.loc.join('.')}: ${err.msg}`)
            .join(', ');
        } else if (typeof e.response.data.detail === 'object') {
          // Handle object with error details
          errorMessage = JSON.stringify(e.response.data.detail);
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW={{ base: "100%", md: "md" }} px={4}>
      <Box
        w="100%"
        p={6}
        borderWidth={1}
        borderRadius="lg"
        boxShadow="md"
        bg="green.100"
        my={8}
      >
        <VStack spacing={6} align="center">
          <Heading as="h1" size="xl">
            <a href="/">EducAI</a>
          </Heading>
          <Heading as="h2" size="lg">
            Create your account
          </Heading>

          <VStack spacing={4} w="100%">
            <FormControl id="nom" isInvalid={!!errors.nom}>
              <FormLabel>Name</FormLabel>
              <Input
                type="text"
                placeholder="Enter your name"
                value={formData.nom}
                onChange={handleChange}
                bg="white"
                size="lg"
              />
              <FormErrorMessage>{errors.nom}</FormErrorMessage>
            </FormControl>

            <FormControl id="email" isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                bg="white"
                size="lg"
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl id="password" isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  bg="white"
                  size="lg"
                />
                <InputRightElement h="full">
                  <IconButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <Button
              colorScheme="teal"
              size="lg"
              width="full"
              onClick={onRegister}
              isLoading={isLoading}
              loadingText="Creating account..."
              mt={4}
            >
              Sign up
            </Button>

            <Text align="center">
              Already have an account? <a href="/login" style={{ color: "teal" }}>Sign in</a>
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Container>
  );
};

export default RegistrationForm;
