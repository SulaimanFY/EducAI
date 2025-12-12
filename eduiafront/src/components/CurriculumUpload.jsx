// src/components/CurriculumUpload.jsx
import { Box, Button, Input, Text } from "@chakra-ui/react";
import { useState } from "react";
import api from "../services/api";

const CurriculumUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file); 

    try {
      const response = await api.post("/update_curriculum/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message);
    } catch (error) {
      console.error("Error uploading curriculum:", error);
      setMessage("An error occurred while uploading the curriculum.");
    }
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="md">
      <Text fontWeight="bold" mb={2}>Upload Curriculum</Text>
      <Input type="file" onChange={handleFileChange} mb={2} />
      <Button colorScheme="teal" onClick={handleUpload}>
        Upload
      </Button>
      {message && <Text mt={2}>{message}</Text>}
    </Box>
  );
};

export default CurriculumUpload;
