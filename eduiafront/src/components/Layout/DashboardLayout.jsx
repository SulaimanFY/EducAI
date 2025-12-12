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

  // Calculate percentage score when correctCount or examData changes
  useEffect(() => {
    const totalQuestions = examData?.submission_data?.length || 0;
    const percentage = totalQuestions > 0 
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
      const response = await api.post("/correct-exam", formData);
      const data = response.data;
      
      // Store all exam data for review
      setExamData(data);
      setExoId(data.data.id_exercice);
      setEleveId(data.data.id_eleve);
      
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
        description: "An error occurred while processing the request. Please try again.",
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
          const response = await api.post("/save-result/", {
            score: count,
            exo_id: exo_id,
            eleve_id: eleve_id
          }, {
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
        description: "An error occurred while validating the results.",
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
        <Heading size="md" mb={4}>Corriger l'Examen</Heading>
        <Box mb={4}>
          <Heading size="sm" mb={2}>Télécharger l'Examen de l'Étudiant</Heading>
          <input type="file" onChange={handleFileChange} />
          <Button 
            onClick={handleSubmit} 
            colorScheme="blue" 
            mt={4} 
            isLoading={isSubmitting}
            loadingText="Traitement..."
          >
            Soumettre
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
              Résumé de l'Examen
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mt={4}>
              <Box textAlign="center">
                <Text fontWeight="bold" color="gray.500">Étudiant</Text>
                <Text fontSize="lg" color="orange.500">
                  {examData.data?.nom_eleve || "Inconnu"}
                </Text>
              </Box>
              
              <Box textAlign="center">
                <Text fontWeight="bold" color="gray.500">Exercice</Text>
                <Text fontSize="lg" color="orange.500">
                  {examData.data?.id_exercice || "Inconnu"}
                </Text>
              </Box>
              
              <Box textAlign="center">
                <Text fontWeight="bold" color="gray.500">Date</Text>
                <Text fontSize="lg" color="orange.500">
                  {examData.data?.date_soumission || "Inconnue"}
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
                Réponses Correctes ({scorePercentage}%)
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
                Valider Tous les Résultats
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
                Détails des Questions
              </Heading>
              
              <IconButton
                icon={expandDetails ? <FiChevronUp /> : <FiChevronDown />}
                variant="ghost"
                onClick={() => setExpandDetails(!expandDetails)}
                aria-label={expandDetails ? "Réduire les détails" : "Afficher les détails"}
              />
            </Flex>
            
            {expandDetails && (
              <Box overflowX="auto">
                <Table variant="simple" size={{ base: "sm", md: "md" }}>
                  <Thead bg="blue.100">
                    <Tr>
                      <Th>QUESTION</Th>
                      <Th>QUESTION COMPLÈTE</Th>
                      <Th>RÉPONSE DE L'ÉTUDIANT</Th>
                      <Th>RÉPONSE CORRECTE</Th>
                      <Th>STATUT</Th>
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
                            {result.status === "PENDING VALIDATION" ? "EN ATTENTE" : 
                             result.status === "CORRECTED" ? "CORRIGÉ" : result.status}
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
                            {editableResult?.id === result.id ? "Enregistrer" : "Modifier"}
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
  });
  const [students, setStudents] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setError("Please select a student");
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
        <Heading size="md" mb={4}>Analyses de Performance</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <Stat p={3} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Score Moyen</StatLabel>
            <StatNumber>{metrics.averageScore}%</StatNumber>
            <StatHelpText>↗︎ {metrics.scoreChange}% depuis le mois dernier</StatHelpText>
            <Progress value={metrics.averageScore} colorScheme="green" mt={2} />
          </Stat>
          <Stat p={3} shadow="sm" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Examens Corrigés</StatLabel>
            <StatNumber>{metrics.examsCorrected}</StatNumber>
            <StatHelpText>↗︎ {metrics.examsTrend} depuis le mois dernier</StatHelpText>
            <Progress value={metrics.examsCorrected} colorScheme="blue" mt={2} />
          </Stat>
        </SimpleGrid>
      </Box>
      
      {/* Recommendation Section */}
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
        <Heading size="md" mb={4}>Recommandations pour les Étudiants</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={5}>
          <Box>
            <Text fontWeight="medium" mb={2}>Sélectionner un Étudiant</Text>
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
              <option value="">-- Sélectionner un étudiant --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.nom} {student.prenom}
                </option>
              ))}
            </select>
          </Box>
          
          <Box>
            <Text fontWeight="medium" mb={2}>Sélectionner un Exercice (Optionnel)</Text>
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
              <option value="">-- Tous les exercices --</option>
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
          Obtenir des Recommandations
        </Button>
        
        {error && (
          <Box p={3} bg="red.50" color="red.500" borderRadius="md" mb={4}>
            {error}
          </Box>
        )}
        
        {recommendation && (
          <Box mt={4} p={4} bg="blue.50" borderRadius="md">
            <Heading size="sm" mb={3} color="blue.700">Recommandations Personnalisées</Heading>
            
            <Box mb={3}>
              <Text fontWeight="bold" color="green.600">Points Forts:</Text>
              <ul style={{ paddingLeft: "20px" }}>
                {recommendation.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </Box>
            
            <Box mb={3}>
              <Text fontWeight="bold" color="orange.600">Points à Améliorer:</Text>
              <ul style={{ paddingLeft: "20px" }}>
                {recommendation.weaknesses.map((weakness, index) => (
                  <li key={index}>{weakness}</li>
                ))}
              </ul>
            </Box>
            
            <Box mb={3}>
              <Text fontWeight="bold" color="blue.600">Recommandations:</Text>
              <ul style={{ paddingLeft: "20px" }}>
                {recommendation.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </Box>
            
            <Box>
              <Text fontWeight="bold" color="purple.600">Ressources Suggérées:</Text>
              <ul style={{ paddingLeft: "20px" }}>
                {recommendation.resources.map((resource, index) => (
                  <li key={index}>{resource}</li>
                ))}
              </ul>
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await api.get("/exams");
        setExams(response.data);
      } catch (error) {
        console.error("Error fetching exams:", error);
        // Fallback test data
        setExams([
          { id: 1, name: "Mathematics", date: "2023-05-01" },
          { id: 2, name: "Physics", date: "2023-05-02" },
          { id: 3, name: "Chemistry", date: "2023-05-03" },
        ]);
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
      <Heading size="md" mb={4}>Résultats des Examens</Heading>
      {loading ? (
        <Text>Chargement...</Text>
      ) : exams.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Text color="gray.500">Aucun examen trouvé</Text>
        </Box>
      ) : (
        <Table variant="simple" size="sm">
          <Thead bg="blue.50">
            <Tr>
              <Th>ID</Th>
              <Th>Titre de l'Examen</Th>
              <Th>Date de Création</Th>
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
                    Voir Résultats
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
          Résultats pour l'Examen: {examTitle || `ID: ${examId}`}
        </Heading>
        <Button 
          leftIcon={<FiChevronLeft />} 
          variant="outline" 
          onClick={() => setActiveTab("results")}
        >
          Retour
        </Button>
      </Flex>
      
      {loading ? (
        <Flex justify="center" py={8}>
          <Text>Chargement des résultats...</Text>
        </Flex>
      ) : results.length === 0 ? (
        <Box textAlign="center" py={8} bg="gray.50" borderRadius="md">
          <Text color="gray.500">Aucun résultat disponible pour cet examen</Text>
        </Box>
      ) : (
        <Table variant="simple" size="md">
          <Thead bg="blue.50">
            <Tr>
              <Th>Étudiant</Th>
              <Th>Score</Th>
              <Th>Date de Soumission</Th>
              <Th>Statut</Th>
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
          Retour à la liste des examens
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
            title: "Session expirée",
            description: "Votre session a expiré. Veuillez vous reconnecter.",
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
            title: "Erreur d'authentification",
            description: "Veuillez vous reconnecter.",
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

  const SidebarContent = ({ onClose, setActiveTab, activeTab, ...rest }) => {
    const items = [
      { name: "Tableau de Bord", icon: FiHome, id: "dashboard" },
      { name: "Corriger Examen", icon: FiCheckCircle, id: "correct-exam" },
      { name: "Analyses", icon: FiBarChart2, id: "insights" },
      { name: "Résultats", icon: FiFileText, id: "results" },
      { name: "Profil", icon: FiUser, id: "profile" },
      { name: "Curriculum", icon: FiUpload, id: "curriculum" },
      { name: "Accueil", icon: FiHome, id: "homepage" }
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
          <Text fontSize="2xl" fontWeight="bold">EduIA</Text>
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
          aria-label="ouvrir menu"
          icon={<FiMenu />}
          display={{ md: "none" }}
        />
        <Text
          fontSize="2xl"
          ml="8"
          fontWeight="bold"
          display={{ base: "none", md: "flex" }}
        >
          Tableau de Bord
        </Text>
        <Flex alignItems="center" ml="auto">
          <Avatar size="sm" name={user ? user.nom : "Utilisateur"} bg="blue.500" />
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
            <Heading size="md" mb={4}>Profil Utilisateur</Heading>
            <Flex direction="column" align="center" mb={4}>
              <Avatar size="xl" name={user ? user.nom : "Utilisateur"} bg="blue.500" mb={4} />
              <Text fontWeight="bold">{user ? user.nom : "Utilisateur"}</Text>
              <Text color="gray.500">{user ? user.email : "utilisateur@exemple.com"}</Text>
            </Flex>
          </Box>
        );
      case "curriculum":
        return <CurriculumUpload />;
      case "homepage":
        return <Box>Redirection vers la page d'accueil...</Box>;
      default:
        return (
          <SimpleGrid columns={{ base: 1, md: 1, lg: 1 }} spacing={5}>
          
            
            {/* Documentation d'aide pour les utilisateurs */}
            <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" bg="white">
              <Heading size="md" mb={4} color="blue.600">Guide d'Utilisation du Tableau de Bord</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box>
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiHome} mr={2} color="blue.500" /> Tableau de Bord
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Visualisez un aperçu général des performances, avec les métriques clés et les recommandations personnalisées pour les étudiants.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiCheckCircle} mr={2} color="green.500" /> Corriger Examen
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Téléchargez et corrigez des examens d'étudiants. Vous pouvez modifier les scores et valider les résultats finaux.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiBarChart2} mr={2} color="purple.500" /> Analyses
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Consultez des statistiques détaillées sur les performances des étudiants et obtenez des recommandations personnalisées.
                  </Text>
                </Box>
                
                <Box>
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiFileText} mr={2} color="orange.500" /> Résultats
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Accédez à la liste des examens et consultez les résultats détaillés pour chaque étudiant.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiUser} mr={2} color="teal.500" /> Profil
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    Gérez votre profil utilisateur et vos informations personnelles.
                  </Text>
                  
                  <Heading size="sm" mb={3} display="flex" alignItems="center">
                    <Icon as={FiUpload} mr={2} color="red.500" /> Curriculum
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    Téléchargez et gérez les programmes d'études et les supports de cours.
                  </Text>
                </Box>
              </SimpleGrid>
              
              <Box mt={6} p={4} bg="blue.50" borderRadius="md">
                <Heading size="sm" mb={2} color="blue.600">Conseil d'utilisation:</Heading>
                <Text fontSize="sm">
                  Pour commencer, utilisez le menu de navigation situé à gauche pour accéder aux différentes fonctionnalités. 
                  Si vous souhaitez corriger un examen, cliquez sur "Corriger Examen" puis téléchargez le fichier PDF de l'étudiant.
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
            <Text fontSize="xl">Chargement du tableau de bord...</Text>
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

