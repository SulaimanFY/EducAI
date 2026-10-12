// src/components/CurriculumUpload.jsx
import { Box, Button, Flex, Heading, HStack, Icon, Text } from "@chakra-ui/react";
import { useState } from "react";
import { FiBookOpen, FiUpload } from "react-icons/fi";
import api from "../services/api";

const CurriculumUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setIsError(true);
      setMessage("Please select a file.");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setIsUploading(true);
      const response = await api.post("/update_curriculum/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsError(false);
      setMessage(response.data.message);
    } catch (error) {
      console.error("Error uploading curriculum:", error);
      setIsError(true);
      setMessage(
        error.response?.data?.detail || "An error occurred while uploading the curriculum."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      p={{ base: 4, md: 6 }}
      maxW="880px"
    >
      <Box mb={5}>
        <Heading size="md" color="gray.900">
          Your curriculum
        </Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          Upload your school's maths curriculum as a PDF. New exercises will follow it. Without
          one, EducAI uses its built-in maths curriculum for ages 6 to 8.
        </Text>
      </Box>
      <Flex gap={4} direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
        <Box
          as="label"
          htmlFor="curriculum-input"
          flex="1"
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={file ? "brand.300" : "gray.300"}
          bg={file ? "brand.50" : "gray.50"}
          borderRadius="xl"
          px={5}
          py={4}
          cursor="pointer"
          _hover={{ borderColor: "brand.400" }}
        >
          <HStack spacing={3}>
            <Icon as={FiBookOpen} boxSize={5} color="brand.500" />
            <Box>
              <Text fontWeight="600" color="gray.800">
                {file ? file.name : "Choose a curriculum PDF"}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {file
                  ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                  : "Text-based PDF, e.g. your school's scheme of work"}
              </Text>
            </Box>
          </HStack>
          <input
            id="curriculum-input"
            data-testid="curriculum-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </Box>
        <Button
          data-testid="upload-curriculum"
          onClick={handleUpload}
          isDisabled={!file}
          isLoading={isUploading}
          loadingText="Uploading..."
          size="lg"
          leftIcon={<FiUpload />}
        >
          Upload
        </Button>
      </Flex>
      {message && (
        <Box
          mt={4}
          px={4}
          py={3}
          borderRadius="lg"
          bg={isError ? "red.50" : "green.50"}
          color={isError ? "red.700" : "green.700"}
          fontSize="sm"
        >
          {message}
        </Box>
      )}
    </Box>
  );
};

export default CurriculumUpload;
