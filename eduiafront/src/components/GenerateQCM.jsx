// src/components/GenerateQCM.jsx
import { useState } from "react";
import { Box, Button, Input, Text } from "@chakra-ui/react";
import api from "../api";

const GenerateQCM = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    try {
        
      const response = await api.get("/generate_qcm/", {
        params: { user_query: query },
      });
      setResult(response.data.qcm);
    } catch (error) {
      console.error("Erreur lors de la génération du QCM :", error);
    }
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="md">
      <Text fontWeight="bold">Générer un QCM</Text>
      <Input
        placeholder="Entrez un thème ou une requête (ex: addition, géométrie...)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        mb={2}
      />
      <Button colorScheme="teal" onClick={handleGenerate}>
        Générer
      </Button>
      {result && (
        <Box mt={4} p={2} bg="gray.100" borderRadius="md">
          <Text>{result}</Text>
        </Box>
      )}
    </Box>
  );
};

export default GenerateQCM;
