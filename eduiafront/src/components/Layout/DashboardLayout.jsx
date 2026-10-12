// src/components/Layout/DashboardLayout.jsx
import {
  Avatar,
  Badge,
  Box,
  Button,
  useColorModeValue as cmv,
  Drawer,
  DrawerContent,
  Flex,
  Heading,
  Icon,
  IconButton,
  Progress,
  SimpleGrid,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  FiBarChart2,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronUp,
  FiFileText,
  FiHome,
  FiMenu,
  FiMessageSquare,
  FiUpload,
  FiUser
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import CurriculumUpload from "../CurriculumUpload";
import EventMessage from "../common/EventMessage";
  
const CorrectExam = () => {
  const [file, setFile] = useState(null);
  const [exo_id, setExoId] = useState(null);
  const [eleve_id, setEleveId] = useState(null);
  const [results, setResults] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [editableResult, setEditableResult] = useState(null);
  const [examData, setExamData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandDetails, setExpandDetails] = useState(true);
  const [scorePercentage, setScorePercentage] = useState(0);
  const toast = useToast();
  const [eventMessage, setEventMessage] = useState({
    isVisible: false,
    message: "",
    status: "success",
    title: ""
  });

  useEffect(() => {
    const totalQuestions =
      examData?.total_questions ?? examData?.submission_data?.length ?? 0;
    const percentage =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    setScorePercentage(percentage);
  }, [correctCount, examData]);

  // Calculate correctCount when examData or results change
  useEffect(() => {
    if (examData?.correct_count !== undefined) {
      setCorrectCount(examData.correct_count);
    } else if (results.length > 0) {
      const count = results.reduce((total, result) => total + result.score, 0);
      setCorrectCount(count);
    }
  }, [examData, results]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setIsSubmitting(true);
      const response = await api.post("/correct-exam/", formData);
      const data = response.data;
      
      // Store all exam data for review
      setExamData(data);
      setExoId(Number(data.data.id_exercice));
      setEleveId(Number(data.data.id_eleve));

      if (data.warning) {
        toast({
          title: "Warning",
          description: data.warning,
          status: "warning",
          duration: 7000,
          isClosable: true,
        });
      }
      
      // Format the submission data into results format
      if (data.submission_data && data.submission_data.length > 0) {
        const formattedResults = data.submission_data.map((item) => {
          // Find corresponding correct answer by matching question identifier
          const correctAnswerItem = data.correct_answers?.find(a => a.id_qcm === item.question);
          
          // Check if answer is correct
          const isCorrect = correctAnswerItem?.lettre === item.answer;
          
          return {
            id: item.id,
            question: item.question,
            fullQuestion: correctAnswerItem?.question || item.question,
            studentAnswer: item.answer,
            correctAnswer: correctAnswerItem?.lettre || "Unknown",
            correctAnswerText: correctAnswerItem?.correct_answer || "Unknown",
            status: "PENDING VALIDATION",
            score: isCorrect ? 1 : 0,
            isCorrect: isCorrect
          };
        });

        // Show questions in order (Q1, Q2, ...)
        const questionNumber = (q) => parseInt(String(q).replace(/\D/g, ""), 10) || 0;
        formattedResults.sort((x, y) => questionNumber(x.question) - questionNumber(y.question));

        setResults(formattedResults);
      } else {
        toast({
          title: "No data found",
          description: "No submission data returned. Please check the uploaded file.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error during API call:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "An error occurred while processing the request. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (result) => {
    setEditableResult(result);
  };

  const handleSave = async (result) => {
    const updatedResults = results.map(r => 
      r.id === result.id ? {...result, status: "PENDING VALIDATION"} : r
    );
    setResults(updatedResults);
    
    // Recalculate the correctCount immediately
    const newCorrectCount = updatedResults.reduce((total, result) => total + result.score, 0);
    setCorrectCount(newCorrectCount);
    
    setEditableResult(null);
    
    toast({
      title: "Score updated",
      description: "Score has been updated and will be saved when you validate all results.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleValidateAll = async () => {
    try {
      const totalQuestions = results.length;
      const count = results.reduce((total, result) => total + result.score, 0);
      setCorrectCount(count);
      
      const savePromises = async () => {
        try {
          const formData = new URLSearchParams();
          formData.append("score", count);
          formData.append("exo_id", exo_id);
          formData.append("eleve_id", eleve_id);

          const response = await api.post("/save-result/", formData, {
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
          });
          
          // Show event message with more details from API response
          setEventMessage({
            isVisible: true,
            message: `Score ${count}/${totalQuestions} saved successfully with ID: ${response.data.result_id}`,
            status: "success",
            title: "Results Saved"
          });
          
          return response;
        } catch (error) {
          // Show error event message
          setEventMessage({
            isVisible: true,
            message: error.response?.data?.detail || "Failed to save results. Please try again.",
            status: "error",
            title: "Save Error"
          });
          throw error;
        }
      };
      
      await savePromises();
      
      const validatedResults = results.map(result => ({
        ...result,
        status: "CORRECTED"
      }));
      
      setResults(validatedResults);
      
      // Toast notification is still kept for immediate feedback
      toast({
        title: "Success",
        description: `All results validated successfully! Final score: ${count}/${totalQuestions}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error validating results:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          "An error occurred while validating the results.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      {/* File Upload Section */}
      <Box 
        p={5} 
        shadow="md" 
        borderWidth="1px" 
        borderRadius="lg" 
        bg="white" 
        mb={6}
      >
        <Heading size="md" mb={4}>Mark an Exam</Heading>
        <Box mb={4}>
          <Heading size="sm" mb={2}>Upload the pupil's answer sheet (PDF)</Heading>
          <input type="file" onChange={handleFileChange} />
          <Button 
            onClick={handleSubmit} 
            colorScheme="blue" 
            mt={4} 
            isLoading={isSubmitting}
            loadingText="Marking..."
          >
            Mark this sheet
          </Button>
        </Box>
      </Box>
      
      {examData && (
        <>
          {/* Exam Summary Card */}
          <Box 
            p={5} 
            shadow="md" 
            borderWidth="1px" 
            borderRadius="lg" 
            bg="white"
            mb={6}
          >
            <Heading size="md" textAlign="center" mb={4}>
              Exam Summary
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mt={4}>
              <Box textAlign="center">
                <Text fontWeight="bold" color="gray.500">Pupil</Text>
                <Text fontSize="lg" color="orange.500">
                  {examData.data?.nom_eleve || "Unknown"}
                </Text>
              </Box>
              
              <Box textAlign="center">
                <Text fontWeight="bold" color="gray.500">Exercise</Text>
                <Text fontSize="lg" color="orange.500">
                  {examData.data?.id_exercice || "Unknown"}
                </Text>
              </Box>
              
              <Box textAlign="center">
                <Text fontWeight="bold" color="gray.500">Date</Text>
                <Text fontSize="lg" color="orange.500">
                  {examData.data?.date_soumission || "Unknown"}
                </Text>
              </Box>
            </SimpleGrid>
            
            <Box 
              display="flex" 
              flexDirection="column"
              alignItems="center"
              mt={6}
              p={5}
              bg="blue.50"
              borderRadius="md"
            >
              <Heading size="lg" color="blue.500">
                {correctCount} / {examData?.submission_data?.length || 0}
              </Heading>
              
              <Text mt={2}>
                Correct answers ({scorePercentage}%)
              </Text>
              
              <Progress 
                value={scorePercentage} 
                size="sm" 
                colorScheme="green" 
                width="100%" 
                mt={3} 
                borderRadius="md"
              />
              
              <Button 
                onClick={handleValidateAll} 
                colorScheme="green" 
                mt={4}
              >
                Validate results
              </Button>
            </Box>
          </Box>

          {/* Question Details Section */}
          <Box 
            p={0} 
            shadow="md" 
            borderWidth="1px" 
            borderRadius="lg" 
            bg="white"
          >
            <Flex 
              justifyContent="space-between" 
              alignItems="center"
              p={4}
              borderBottomWidth={expandDetails ? "1px" : "0"}
              borderBottomColor="gray.200"
            >
              <Heading size="md" color="blue.500">
                Question details
              </Heading>
              
              <IconButton
                icon={expandDetails ? <FiChevronUp /> : <FiChevronDown />}
                variant="ghost"
                onClick={() => setExpandDetails(!expandDetails)}
                aria-label={expandDetails ? "Hide details" : "Show details"}
              />
            </Flex>
            
            {expandDetails && (
              <Box overflowX="auto">
                <Table variant="simple" size={{ base: "sm", md: "md" }}>
                  <Thead bg="blue.100">
                    <Tr>
                      <Th>QUESTION</Th>
                      <Th>FULL QUESTION</Th>
                      <Th>PUPIL'S ANSWER</Th>
                      <Th>CORRECT ANSWER</Th>
                      <Th>STATUS</Th>
                      <Th>SCORE</Th>
                      <Th>ACTIONS</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {results.map((result) => (
                      <Tr 
                        key={result.id} 
                        bg={result.isCorrect ? "green.50" : "red.50"}
                      >
                        <Td>{result.question}</Td>
                        <Td maxWidth="300px" isTruncated title={result.fullQuestion}>
                          {result.fullQuestion}
                        </Td>
                        <Td>
                          {result.studentAnswer}
                        </Td>
                        <Td>
                          <Text fontWeight="bold">
                            {result.correctAnswer || (result.correct_answers && result.correct_answers[result.question])}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {result.correctAnswerText}
                          </Text>
                        </Td>
                        <Td>
                          <Box 
                            bg="yellow.100" 
                            color="yellow.800" 
                            px={2} 
                            py={1} 
                            borderRadius="md" 
                            fontSize="sm"
                            fontWeight="medium"
                            display="inline-block"
                          >
                            {result.status === "PENDING VALIDATION" ? "PENDING" : 
                             result.status === "CORRECTED" ? "VALIDATED" : result.status}
                          </Box>
                        </Td>
                        <Td>
                          {editableResult?.id === result.id ? (
                            <input
                              type="number"
                              min="0"
                              max="1"
                              value={result.score}
                              onChange={(e) => {
                                const updatedResult = { ...result, score: parseInt(e.target.value) };
                                setResults((prev) =>
                                  prev.map((r) => (r.id === result.id ? updatedResult : r))
                                );
                                setEditableResult(updatedResult);
                              }}
                              style={{
                                width: "40px",
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #ccc",
                                padding: "4px"
                              }}
                            />
                          ) : (
                            result.score
                          )}
                        </Td>
                        <Td>
                          <Button 
                            onClick={() => editableResult?.id === result.id ? 
                              handleSave(result) : handleEdit(result)}
                            colorScheme={editableResult?.id === result.id ? "green" : "yellow"}
                            size="sm"
                          >
                            {editableResult?.id === result.id ? "Save" : "Edit"}
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </Box>
        </>
      )}
      
      {/* Event message component */}
      <EventMessage
        isVisible={eventMessage.isVisible}
        message={eventMessage.message}
        status={eventMessage.status}
        title={eventMessage.title}
        autoHideDuration={7000}
        position="bottom-right"
        onClose={() => setEventMessage(prev => ({ ...prev, isVisible: false }))}
      />
    </Box>
  );
};

const Insights = () => {
  const [metrics, setMetrics] = useState({
    averageScore: 0,
    examsCorrected: 0,
    scoreChange: 0,
    examsTrend: 0,
    hasPreviousPeriod: false,
  });
  const [students, setStudents] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const renderRecommendationItems = (items = [], colorScheme = "blue") => (
    <VStack align="stretch" spacing={2} mt={2}>
      {items.map((item, index) => (
        <Box
          key={index}
          bg="white"
          borderLeft="4px solid"
          borderColor={`${colorScheme}.400`}
          borderRadius="md"
          px={3}
          py={2}
          boxShadow="sm"
        >
          <Text fontSize="sm" color="gray.700">{item}</Text>
        </Box>
      ))}
    </VStack>
  );

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get("/metrics");
        setMetrics(response.data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };
    
    const fetchStudentsAndExercises = async () => {
      try {
        const studentsResponse = await api.get("/students");
        setStudents(studentsResponse.data);
        
        const exercisesResponse = await api.get("/exercises");
        setExercises(exercisesResponse.data);
      } catch (error) {
        console.error("Error fetching students and exercises:", error);
      }
    };
    
    fetchMetrics();
    fetchStudentsAndExercises();
  }, []);

  const handleGetRecommendation = async () => {
    if (!selectedStudent) {
      setError("Please select a pupil");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const url = selectedExercise 
        ? `/recommendations/student/${selectedStudent}?exercice_id=${selectedExercise}`
        : `/recommendations/student/${selectedStudent}`;
        
      const response = await api.get(url);
      setRecommendation(response.data);
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      setError(error.response?.data?.detail || "Failed to get recommendation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white" mb={5}>
        <Heading size="md" mb={4}>Performance Insights</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <Stat p={3} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Average score</StatLabel>
            <StatNumber>{metrics.averageScore}%</StatNumber>
            {metrics.hasPreviousPeriod ? (
              <StatHelpText color={metrics.scoreChange >= 0 ? "green.500" : "red.500"}>
                {metrics.scoreChange >= 0 ? "↗︎" : "↘︎"} {Math.abs(metrics.scoreChange)}% since last month
              </StatHelpText>
            ) : (
              <StatHelpText color="gray.500">No previous month to compare yet</StatHelpText>
            )}
            <Progress value={metrics.averageScore} colorScheme="green" mt={2} />
          </Stat>
          <Stat p={3} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Exams marked</StatLabel>
            <StatNumber>{metrics.examsCorrected}</StatNumber>
            {metrics.hasPreviousPeriod ? (
              <StatHelpText color={metrics.examsTrend >= 0 ? "green.500" : "red.500"}>
                {metrics.examsTrend >= 0 ? "↗︎" : "↘︎"} {Math.abs(metrics.examsTrend)} since last month
              </StatHelpText>
            ) : (
              <StatHelpText color="gray.500">No previous month to compare yet</StatHelpText>
            )}
          </Stat>
        </SimpleGrid>
      </Box>
      
      {/* Recommendation Section */}
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
        <Heading size="md" mb={4}>Pupil Recommendations</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={5}>
          <Box>
            <Text fontWeight="medium" mb={2}>Select a pupil</Text>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "md",
                border: "1px solid #E2E8F0"
              }}
            >
              <option value="">-- Select a pupil --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.nom}{student.email ? ` (${student.email})` : ""}
                </option>
              ))}
            </select>
          </Box>
          
          <Box>
            <Text fontWeight="medium" mb={2}>Select an exercise (optional)</Text>
            <select 
              value={selectedExercise} 
              onChange={(e) => setSelectedExercise(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "md",
                border: "1px solid #E2E8F0"
              }}
            >
              <option value="">-- All exercises --</option>
              {exercises.map(exercise => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.titre}
                </option>
              ))}
            </select>
          </Box>
        </SimpleGrid>
        
        <Button 
          colorScheme="blue" 
          onClick={handleGetRecommendation}
          isLoading={isLoading}
          isDisabled={!selectedStudent}
          width="full"
          mb={4}
        >
          Get recommendations
        </Button>
        
        {error && (
          <Box p={3} bg="red.50" color="red.500" borderRadius="md" mb={4}>
            {error}
          </Box>
        )}
        
        {recommendation && (
          <Box mt={4} p={4} bg="blue.50" borderRadius="md">
            <Heading size="sm" mb={3} color="blue.700">Personalised recommendations</Heading>
            
            <Box mb={3}>
              <Text fontWeight="bold" color="green.600">Strengths:</Text>
              {renderRecommendationItems(recommendation.strengths, "green")}
            </Box>
            
            <Box mb={3}>
              <Text fontWeight="bold" color="orange.600">Areas to improve:</Text>
              {renderRecommendationItems(recommendation.weaknesses, "orange")}
            </Box>
            
            <Box mb={3}>
              <Text fontWeight="bold" color="blue.600">Recommendations:</Text>
              {renderRecommendationItems(recommendation.recommendations, "blue")}
            </Box>
            
            <Box>
              <Text fontWeight="bold" color="purple.600">Suggested resources:</Text>
              {renderRecommendationItems(recommendation.resources, "purple")}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const ExamResults = ({ setActiveTab, setSelectedExamId }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await api.get("/exams");
        setExams(response.data);
      } catch (error) {
        console.error("Error fetching exams:", error);
        setExams([]);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const handleExamClick = (examId) => {
    setSelectedExamId(examId);
    setActiveTab("exam-details");
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
      <Heading size="md" mb={4}>Exam Results</Heading>
      {loading ? (
        <Text>Loading...</Text>
      ) : exams.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Text color="gray.500">No exams yet</Text>
        </Box>
      ) : (
        <Table variant="simple" size="sm">
          <Thead bg="blue.50">
            <Tr>
              <Th>ID</Th>
              <Th>Exam title</Th>
              <Th>Created on</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {exams.map((exam) => (
              <Tr
                key={exam.id}
                _hover={{ bg: "gray.50" }}
                cursor="pointer"
              >
                <Td>{exam.id}</Td>
                <Td fontWeight="medium">{exam.name}</Td>
                <Td>{exam.date}</Td>
                <Td>
                  <Button 
                    colorScheme="blue" 
                    size="sm"
                    onClick={() => handleExamClick(exam.id)}
                  >
                    View results
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

const ExamDetails = ({ examId, setActiveTab }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");

  useEffect(() => {
    const fetchExamResults = async () => {
      try {
        const response = await api.get(`/exam-results/${examId}`);
        setResults(response.data);
        
        // Try to get exam title - optional enhancement
        try {
          const examsResponse = await api.get("/exams");
          const exam = examsResponse.data.find(e => e.id === examId);
          if (exam) setExamTitle(exam.name);
        } catch (err) {
          console.log("Could not fetch exam title");
        }
      } catch (error) {
        console.error("Error fetching exam results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExamResults();
  }, [examId]);

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">
          Results for: {examTitle || `Exam ${examId}`}
        </Heading>
        <Button 
          leftIcon={<FiChevronLeft />} 
          variant="outline" 
          onClick={() => setActiveTab("results")}
        >
          Back
        </Button>
      </Flex>
      
      {loading ? (
        <Flex justify="center" py={8}>
          <Text>Loading results...</Text>
        </Flex>
      ) : results.length === 0 ? (
        <Box textAlign="center" py={8} bg="gray.50" borderRadius="md">
          <Text color="gray.500">No results for this exam yet</Text>
        </Box>
      ) : (
        <Table variant="simple" size="md">
          <Thead bg="blue.50">
            <Tr>
              <Th>Pupil</Th>
              <Th>Score</Th>
              <Th>Submitted on</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {results.map((result, idx) => (
              <Tr key={idx} _hover={{ bg: "gray.50" }}>
                <Td fontWeight="medium">{result.student}</Td>
                <Td isNumeric>
                  <Badge 
                    colorScheme={
                      result.status === "PENDING" ? "yellow" :
                      result.score >= 70 ? "green" : "red"
                    }
                    py={1} px={2}
                  >
                    {result.score}%
                  </Badge>
                </Td>
                <Td>{result.submission_date}</Td>
                <Td>
                  <Badge 
                    colorScheme={
                      result.status === "PENDING" ? "yellow" :
                      result.status === "PASSED" ? "green" : "orange"
                    }
                  >
                    {result.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      
      <Flex justify="center" mt={6}>
        <Button onClick={() => setActiveTab("results")}>
          Back to all exams
        </Button>
      </Flex>
    </Box>
  );
};

const DashboardLayout = () => {
  const isAuthenticated = !!localStorage.getItem("token");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Intercept API responses for 401 errors globally
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("token");
          toast({
            title: "Session expired",
            description: "Your session has expired. Please sign in again.",
            status: "warning",
            duration: 5000,
            isClosable: true,
          });
          navigate("/login");
        }
        return Promise.reject(error);
      }
    );

    // Clean up interceptor when component unmounts
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [navigate, toast]);

  // Handle redirection for unauthenticated users
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Verify authentication and fetch user profile
  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token by fetching user profile
        const response = await api.get("/me/");
        setUser(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Authentication error:", error);
        // If error is not 401 (which is handled by interceptor)
        if (!error.response || error.response.status !== 401) {
          toast({
            title: "Authentication error",
            description: "Please sign in again.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          localStorage.removeItem("token");
          navigate("/login");
        }
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [isAuthenticated, navigate, toast]);

  // ADD THIS EFFECT: Handle homepage navigation
  useEffect(() => {
    if (activeTab === "homepage") {
      navigate("/");
    }
  }, [activeTab, navigate]);

  const pageTitles = {
    dashboard: "Dashboard",
    "correct-exam": "Mark Exam",
    insights: "Insights",
    results: "Results",
    "exam-details": "Results",
    profile: "Profile",
    curriculum: "Curriculum",
  };

  const SidebarContent = ({ onClose, setActiveTab, activeTab, ...rest }) => {
    const items = [
      { name: "Dashboard", icon: FiHome, id: "dashboard" },
      { name: "Mark Exam", icon: FiCheckCircle, id: "correct-exam" },
      { name: "Insights", icon: FiBarChart2, id: "insights" },
      { name: "Results", icon: FiFileText, id: "results" },
      { name: "Profile", icon: FiUser, id: "profile" },
      { name: "Curriculum", icon: FiUpload, id: "curriculum" },
      { name: "Exercise chat", icon: FiMessageSquare, id: "homepage" }
    ];

    return (
      <Box
        bg={cmv("white", "gray.900")}
        borderRight="1px"
        borderRightColor={cmv("gray.200", "gray.700")}
        w={{ base: "full", md: "250px" }}
        top={0}
        left={0}
        pos="fixed"
        h="100vh"
        zIndex="20"
        {...rest}
      >
        <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
          <Text fontSize="2xl" fontWeight="bold">EducAI</Text>
        </Flex>
        <VStack spacing={4} align="stretch" mt={6}>
          {items.map((item) => (
            <Flex
              key={item.id}
              align="center"
              p="4"
              mx="4"
              borderRadius="lg"
              role="group"
              cursor="pointer"
              _hover={{ bg: "cyan.400", color: "white" }}
              bg={activeTab === item.id ? "cyan.400" : "transparent"}
              color={activeTab === item.id ? "white" : "inherit"}
              onClick={() => {
                setActiveTab(item.id);
                if (typeof onClose === "function") onClose();
              }}
            >
              <Icon mr="4" fontSize="16" as={item.icon} />
              {item.name}
            </Flex>
          ))}
        </VStack>
      </Box>
    );
  };

  const MobileNav = ({ onOpen, ...rest }) => {
    return (
      <Flex
        ml={{ base: 0, md: 60 }}
        px={{ base: 4, md: 24 }}
        height="20"
        alignItems="center"
        bg={cmv("white", "gray.900")}
        borderBottomWidth="1px"
        borderBottomColor={cmv("gray.200", "gray.700")}
        justifyContent="flex-start"
        position="fixed"
        top="0"
        right="0"
        left="0"
        zIndex="10"
        {...rest}
      >
        <IconButton
          variant="outline"
          onClick={onOpen}
          aria-label="open menu"
          icon={<FiMenu />}
          display={{ md: "none" }}
        />
        <Text
          fontSize="2xl"
          ml="8"
          fontWeight="bold"
          display={{ base: "none", md: "flex" }}
        >
          {pageTitles[activeTab] || "Dashboard"}
        </Text>
        <Flex alignItems="center" ml="auto">
          <Avatar size="sm" name={user ? user.nom : "User"} bg="blue.500" />
        </Flex>
      </Flex>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "correct-exam":
        return <CorrectExam />;
      case "insights":
        return <Insights />;
      case "results":
        return (
          <ExamResults
            setActiveTab={setActiveTab}
            setSelectedExamId={setSelectedExamId}
          />
        );
      case "exam-details":
        return <ExamDetails examId={selectedExamId} setActiveTab={setActiveTab} />;
      case "profile":
        return (
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
            <Heading size="md" mb={4}>Profile</Heading>
            <Flex direction="column" align="center" mb={4}>
              <Avatar size="xl" name={user ? user.nom : "User"} bg="blue.500" mb={4} />
              <Text fontWeight="bold">{user ? user.nom : "User"}</Text>
              <Text color="gray.500">{user ? user.email : "user@example.com"}</Text>
            </Flex>
          </Box>
        );
      case "curriculum":
        return <CurriculumUpload />;
      case "homepage":
        return <Box>Redirecting to the exercise chat...</Box>;
      default:
        return (
          <SimpleGrid columns={{ base: 1, md: 1, lg: 1 }} spacing={5}>
          
            
            {/* Quick guide for teachers */}
            <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
              <Heading size="md" mb={4} color="blue.600">How to use the dashboard</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiHome} mr={2} color="blue.500" /> Dashboard
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    See an overview of class performance, with key metrics and personalised recommendations for each pupil.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiCheckCircle} mr={2} color="green.500" /> Mark Exam
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Upload a pupil's PDF answer sheet and get it marked against the answer key. You can adjust any score before validating the final result.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiBarChart2} mr={2} color="purple.500" /> Insights
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Review detailed statistics on pupil performance and get personalised recommendations.
                  </Text>
                </Box>
                
                <Box>
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiFileText} mr={2} color="orange.500" /> Results
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Browse your exams and see each pupil's results.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiUser} mr={2} color="teal.500" /> Profile
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    View your account details.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiUpload} mr={2} color="red.500" /> Curriculum
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    Upload the curriculum document that new exercises should follow.
                  </Text>
                </Box>
              </SimpleGrid>
              
              <Box mt={6} p={4} bg="blue.50" borderRadius="md">
                <Heading size="sm" mb={2} color="blue.600">Tip:</Heading>
                <Text fontSize="sm">
                  Use the menu on the left to move between sections.
                  To mark an exam, click "Mark Exam" and upload the pupil's PDF answer sheet.
                </Text>
              </Box>
            </Box>
              <Insights />
          </SimpleGrid>
        );
    }
  };

  // Render based on conditions instead of early returns
  return (
    <Box minH="100vh" bg={cmv("gray.50", "gray.900")}>
      {isLoading ? (
        <Flex height="100vh" width="100%" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Text fontSize="xl">Loading dashboard...</Text>
            <Progress size="xs" isIndeterminate width="200px" colorScheme="blue" />
          </VStack>
        </Flex>
      ) : (
        <>
          {/* Desktop sidebar */}
          <SidebarContent
            display={{ base: "none", md: "block" }}
            onClose={() => onClose()}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />

          {/* Mobile drawer */}
          <Drawer
            autoFocus={false}
            isOpen={isOpen}
            placement="left"
            onClose={onClose}
            returnFocusOnClose={false}
            onOverlayClick={onClose}
            size="full"
          >
            <DrawerContent>
              <SidebarContent
                onClose={onClose}
                setActiveTab={setActiveTab}
                activeTab={activeTab}
              />
            </DrawerContent>
          </Drawer>

          {/* Header */}
          <MobileNav onOpen={onOpen} />

          {/* Content area */}
          <Box
            ml={{ base: 0, md: "60px" }}
            p="4"
            pt="24"
            width={{ base: "100%", md: "calc(100% - 250px)" }}
            position="absolute"
            top="0"
            right="0"
            transition="none"
            overflowX="hidden"
          >
            {renderContent()}
          </Box>
        </>
      )}
    </Box>
  );
};

export default DashboardLayout;

