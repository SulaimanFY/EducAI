// src/components/Layout/DashboardLayout.jsx
import {
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerContent,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiFileText,
  FiHome,
  FiMenu,
  FiMessageSquare,
  FiPlus,
  FiTarget,
  FiTrendingUp,
  FiUpload,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import CurriculumUpload from "../CurriculumUpload";
import EventMessage from "../common/EventMessage";
import { Logo } from "./Navbar";

const SIDEBAR_WIDTH = "260px";

// ------------------------------------------------------------------
// Shared building blocks
// ------------------------------------------------------------------
export const Panel = ({ children, ...rest }) => (
  <Box
    bg="white"
    borderWidth="1px"
    borderColor="gray.200"
    borderRadius="xl"
    p={{ base: 4, md: 6 }}
    {...rest}
  >
    {children}
  </Box>
);

const PanelTitle = ({ title, subtitle }) => (
  <Box mb={5}>
    <Heading size="md" color="gray.900">
      {title}
    </Heading>
    {subtitle && (
      <Text color="gray.500" mt={1} fontSize="sm">
        {subtitle}
      </Text>
    )}
  </Box>
);

const StatCard = ({ icon, label, value, help, color = "brand", children }) => (
  <Panel p={5}>
    <HStack spacing={4} align="flex-start">
      <Flex
        w="40px"
        h="40px"
        borderRadius="lg"
        bg={`${color}.50`}
        color={`${color}.600`}
        align="center"
        justify="center"
        flexShrink={0}
      >
        <Icon as={icon} boxSize={5} />
      </Flex>
      <Box flex="1">
        <Text fontSize="sm" color="gray.500">
          {label}
        </Text>
        <Text fontSize="2xl" fontWeight="700" color="gray.900" lineHeight="1.3">
          {value}
        </Text>
        {help && (
          <Text fontSize="xs" color="gray.400" mt={1}>
            {help}
          </Text>
        )}
        {children}
      </Box>
    </HStack>
  </Panel>
);

const ResultBadge = ({ correct }) => (
  <Badge
    colorScheme={correct ? "green" : "red"}
    variant="subtle"
    borderRadius="full"
    px={2.5}
    py={0.5}
    textTransform="none"
    fontSize="xs"
  >
    {correct ? "Correct" : "Wrong"}
  </Badge>
);

// A dropdown that renders in the page (unlike a native select), with a hint per option
const Picker = ({ testId, placeholder, value, options, onChange }) => {
  const current = options.find((option) => String(option.value) === String(value));
  return (
    <Menu matchWidth>
      <MenuButton
        as={Button}
        data-testid={testId}
        variant="outline"
        colorScheme="gray"
        bg="white"
        w="100%"
        h="44px"
        textAlign="left"
        fontWeight="400"
        rightIcon={<FiChevronDown />}
      >
        <Text as="span" noOfLines={1} color={current ? "gray.900" : "gray.500"}>
          {current ? current.label : placeholder}
        </Text>
      </MenuButton>
      <MenuList zIndex={30} maxH="320px" overflowY="auto" py={2} boxShadow="lg">
        {options.map((option) => {
          const selected = String(option.value) === String(value);
          return (
            <MenuItem
              key={option.value}
              data-testid={`${testId}-option-${option.value === "" ? "all" : option.value}`}
              onClick={() => onChange(String(option.value))}
              px={4}
              py={2}
            >
              <Box flex="1">
                <Text fontWeight={selected ? "600" : "500"} color="gray.900">
                  {option.label}
                </Text>
                {option.help && (
                  <Text fontSize="xs" color="gray.500">
                    {option.help}
                  </Text>
                )}
              </Box>
              {selected && <Icon as={FiCheck} color="brand.500" ml={3} />}
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
};

const percent = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

// ------------------------------------------------------------------
// Mark an answer sheet
// ------------------------------------------------------------------
const CorrectExam = () => {
  const [file, setFile] = useState(null);
  const [exo_id, setExoId] = useState(null);
  const [eleve_id, setEleveId] = useState(null);
  const [results, setResults] = useState([]);
  const [editableResult, setEditableResult] = useState(null);
  const [examData, setExamData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const toast = useToast();
  const [eventMessage, setEventMessage] = useState({
    isVisible: false,
    message: "",
    status: "success",
    title: "",
  });

  const correctCount = results.reduce((total, result) => total + (result.score || 0), 0);
  const totalQuestions = results.length;
  const scorePercentage = percent(correctCount, totalQuestions);

  const handleFileChange = (event) => {
    setFile(event.target.files[0] || null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setIsSubmitting(true);
      setIsValidated(false);
      const response = await api.post("/correct-exam/", formData);
      const data = response.data;

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

      if (data.submission_data && data.submission_data.length > 0) {
        const formattedResults = data.submission_data.map((item) => {
          const key = data.correct_answers?.find((a) => a.id_qcm === item.question);
          const options = data.options?.[item.question] || [];
          const pupilOption = options.find((o) => o.letter === item.answer);
          const isCorrect = key?.lettre === item.answer;

          return {
            id: item.id,
            question: item.question,
            fullQuestion: key?.question || item.question,
            studentAnswer: item.answer,
            studentAnswerText: pupilOption?.text || "",
            correctAnswer: key?.lettre || "?",
            correctAnswerText: key?.correct_answer || "",
            score: isCorrect ? 1 : 0,
            isCorrect,
          };
        });

        // Show questions in order (Q1, Q2, ...)
        const questionNumber = (q) => parseInt(String(q).replace(/\D/g, ""), 10) || 0;
        formattedResults.sort((x, y) => questionNumber(x.question) - questionNumber(y.question));

        setResults(formattedResults);
      } else {
        toast({
          title: "No answers found",
          description: "No answers were found in this file. Please check the PDF.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error during API call:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          "An error occurred while processing the request. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = (result) => {
    setResults((prev) => prev.map((r) => (r.id === result.id ? result : r)));
    setEditableResult(null);
    setIsValidated(false);
    toast({
      title: "Mark updated",
      description: "The total is updated. Validate to save the final result.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleValidateAll = async () => {
    try {
      setIsSaving(true);
      const formData = new URLSearchParams();
      formData.append("score", correctCount);
      formData.append("exo_id", exo_id);
      formData.append("eleve_id", eleve_id);

      const response = await api.post("/save-result/", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      setIsValidated(true);
      setEventMessage({
        isVisible: true,
        message: `${examData?.data?.nom_eleve || "Pupil"}: ${correctCount}/${totalQuestions} saved (result #${response.data.result_id}).`,
        status: "success",
        title: "Result saved",
      });
    } catch (error) {
      console.error("Error validating results:", error);
      setEventMessage({
        isVisible: true,
        message: error.response?.data?.detail || "Failed to save results. Please try again.",
        status: "error",
        title: "Save error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Panel>
        <PanelTitle
          title="Mark an answer sheet"
          subtitle="Upload a pupil's PDF answer sheet. EducAI reads it and marks every answer against the exercise's answer key."
        />
        <Flex gap={4} direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
          <Box
            as="label"
            htmlFor="sheet-input"
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
              <Icon as={FiUpload} boxSize={5} color="brand.500" />
              <Box>
                <Text fontWeight="600" color="gray.800">
                  {file ? file.name : "Choose a PDF answer sheet"}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Typed sheet: name, pupil ID, exercise ID, one letter per question"}
                </Text>
              </Box>
            </HStack>
            <input
              id="sheet-input"
              data-testid="sheet-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </Box>
          <Button
            data-testid="mark-sheet"
            onClick={handleSubmit}
            isDisabled={!file}
            isLoading={isSubmitting}
            loadingText="Reading and marking..."
            size="lg"
            leftIcon={<FiCheckCircle />}
          >
            Mark this sheet
          </Button>
        </Flex>
      </Panel>

      {examData && results.length > 0 && (
        <>
          <Panel data-testid="exam-summary">
            <Flex gap={6} direction={{ base: "column", lg: "row" }} align={{ lg: "center" }}>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} flex="1">
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Pupil
                  </Text>
                  <Text fontSize="lg" fontWeight="700" color="gray.900">
                    {examData.data?.nom_eleve || "Unknown"}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    ID {examData.data?.id_eleve}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Exercise
                  </Text>
                  <Text fontSize="lg" fontWeight="700" color="gray.900" noOfLines={2}>
                    {examData.exercise_title || `Exercise ${examData.data?.id_exercice}`}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    #{examData.data?.id_exercice}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Date
                  </Text>
                  <Text fontSize="lg" fontWeight="700" color="gray.900">
                    {examData.data?.date_soumission || "Unknown"}
                  </Text>
                </Box>
              </SimpleGrid>
              <Box
                minW={{ lg: "260px" }}
                bg="gray.50"
                borderRadius="xl"
                p={5}
                textAlign="center"
                data-testid="exam-score"
              >
                <Text fontSize="sm" color="gray.500">
                  Score
                </Text>
                <Text fontSize="4xl" fontWeight="800" color="gray.900" lineHeight="1.1">
                  {correctCount} / {totalQuestions}
                </Text>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  {scorePercentage}% correct
                </Text>
                <Progress
                  value={scorePercentage}
                  size="sm"
                  colorScheme={scorePercentage >= 70 ? "green" : "orange"}
                  borderRadius="full"
                  mb={4}
                />
                <Button
                  data-testid="validate-results"
                  onClick={handleValidateAll}
                  colorScheme="green"
                  w="100%"
                  isLoading={isSaving}
                  isDisabled={isValidated}
                  leftIcon={<FiCheckCircle />}
                >
                  {isValidated ? "Result saved" : "Validate results"}
                </Button>
              </Box>
            </Flex>
          </Panel>

          <Panel p={0} overflow="hidden" data-testid="question-details">
            <Flex justify="space-between" align="center" px={6} py={4}>
              <Heading size="sm" color="gray.900">
                Question details
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Click Edit to change a mark before validating
              </Text>
            </Flex>
            <Box overflowX="auto">
              <Table size="md">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>#</Th>
                    <Th>Question</Th>
                    <Th>Pupil's answer</Th>
                    <Th>Correct answer</Th>
                    <Th>Result</Th>
                    <Th>Mark</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {results.map((result) => {
                    const isEditing = editableResult?.id === result.id;
                    return (
                      <Tr key={result.id} data-testid={`row-${result.question}`}>
                        <Td fontWeight="600" color="gray.500">
                          {result.question}
                        </Td>
                        <Td maxW="380px" whiteSpace="normal" color="gray.800">
                          {result.fullQuestion}
                        </Td>
                        <Td whiteSpace="nowrap">
                          <Text as="span" fontWeight="700">
                            {result.studentAnswer})
                          </Text>{" "}
                          {result.studentAnswerText}
                        </Td>
                        <Td whiteSpace="nowrap">
                          <Text as="span" fontWeight="700">
                            {result.correctAnswer})
                          </Text>{" "}
                          {result.correctAnswerText}
                        </Td>
                        <Td>
                          <ResultBadge correct={result.isCorrect} />
                        </Td>
                        <Td>
                          {isEditing ? (
                            <Input
                              data-testid={`mark-input-${result.question}`}
                              type="number"
                              min={0}
                              max={1}
                              size="sm"
                              w="64px"
                              value={editableResult.score}
                              onChange={(e) =>
                                setEditableResult({
                                  ...editableResult,
                                  score: Math.max(0, Math.min(1, parseInt(e.target.value, 10) || 0)),
                                })
                              }
                            />
                          ) : (
                            <Text fontWeight="700">{result.score}</Text>
                          )}
                        </Td>
                        <Td>
                          <Button
                            data-testid={`edit-${result.question}`}
                            size="sm"
                            variant={isEditing ? "solid" : "ghost"}
                            colorScheme={isEditing ? "green" : "gray"}
                            onClick={() =>
                              isEditing ? handleSave(editableResult) : setEditableResult(result)
                            }
                          >
                            {isEditing ? "Save" : "Edit"}
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Panel>
        </>
      )}

      <EventMessage
        isVisible={eventMessage.isVisible}
        message={eventMessage.message}
        status={eventMessage.status}
        title={eventMessage.title}
        autoHideDuration={7000}
        position="bottom-right"
        onClose={() => setEventMessage((prev) => ({ ...prev, isVisible: false }))}
      />
    </VStack>
  );
};

// ------------------------------------------------------------------
// Insights and recommendations
// ------------------------------------------------------------------
const RECOMMENDATION_SECTIONS = [
  { key: "strengths", title: "Strengths", icon: FiAward, color: "green" },
  { key: "weaknesses", title: "Areas to improve", icon: FiTarget, color: "orange" },
  { key: "recommendations", title: "Recommendations", icon: FiTrendingUp, color: "blue" },
  { key: "resources", title: "Suggested resources", icon: FiBookOpen, color: "purple" },
];

const useMetrics = () => {
  const [metrics, setMetrics] = useState({
    averageScore: 0,
    examsCorrected: 0,
    scoreChange: 0,
    examsTrend: 0,
    hasPreviousPeriod: false,
  });
  useEffect(() => {
    api
      .get("/metrics")
      .then((response) => setMetrics(response.data))
      .catch((error) => console.error("Error fetching metrics:", error));
  }, []);
  return metrics;
};

const trendText = (metrics, value, suffix) =>
  metrics.hasPreviousPeriod
    ? `${value >= 0 ? "↗︎" : "↘︎"} ${Math.abs(value)}${suffix} since last month`
    : "No previous month to compare yet";

const Insights = () => {
  const metrics = useMetrics();
  const [students, setStudents] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
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
    fetchStudentsAndExercises();
  }, []);

  const pupil = students.find((student) => String(student.id) === String(selectedStudent));

  const handleGetRecommendation = async () => {
    if (!selectedStudent) {
      setError("Please select a pupil");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    try {
      const url = selectedExercise
        ? `/recommendations/student/${selectedStudent}?exercice_id=${selectedExercise}`
        : `/recommendations/student/${selectedStudent}`;
      const response = await api.get(url);
      setRecommendation(response.data);
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      setError(error.response?.data?.detail || "Failed to get recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <StatCard
          icon={FiBarChart2}
          label="Average score"
          value={`${Math.round(metrics.averageScore)}%`}
          help={trendText(metrics, metrics.scoreChange, "%")}
        >
          <Progress
            value={metrics.averageScore}
            size="xs"
            colorScheme="brand"
            borderRadius="full"
            mt={3}
          />
        </StatCard>
        <StatCard
          icon={FiCheckCircle}
          label="Answer sheets marked"
          value={metrics.examsCorrected}
          help={trendText(metrics, metrics.examsTrend, "")}
          color="green"
        />
      </SimpleGrid>

      <Panel>
        <PanelTitle
          title="Pupil recommendations"
          subtitle="Strengths, gaps and next steps, based only on the pupil's validated results."
        />
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={5}>
          <Box>
            <Text fontWeight="600" fontSize="sm" mb={2}>
              Pupil
            </Text>
            <Picker
              testId="pupil-select"
              placeholder="Select a pupil"
              value={selectedStudent}
              onChange={(value) => {
                setSelectedStudent(value);
                setSelectedExercise("");
                setRecommendation(null);
                setError(null);
              }}
              options={students.map((student) => ({
                value: student.id,
                label: student.nom,
                help: `Pupil ID ${student.id} · ${(student.exercise_ids || []).length} marked ${
                  (student.exercise_ids || []).length === 1 ? "exercise" : "exercises"
                }`,
              }))}
            />
          </Box>
          <Box>
            <Text fontWeight="600" fontSize="sm" mb={2}>
              Exercise (optional)
            </Text>
            <Picker
              testId="exercise-select"
              value={selectedExercise}
              onChange={(value) => {
                setSelectedExercise(value);
                setRecommendation(null);
                setError(null);
              }}
              options={[
                { value: "", label: "All exercises" },
                ...exercises
                  .filter((exercise) => (pupil?.exercise_ids || []).includes(exercise.id))
                  .map((exercise) => ({ value: exercise.id, label: exercise.titre, help: `Exercise #${exercise.id}` })),
              ]}
            />
          </Box>
        </SimpleGrid>

        <Button
          data-testid="get-recommendations"
          onClick={handleGetRecommendation}
          isLoading={isLoading}
          loadingText="Analysing results..."
          isDisabled={!selectedStudent}
          leftIcon={<FiTrendingUp />}
        >
          Get recommendations
        </Button>

        {error && (
          <Box p={3} bg="red.50" color="red.600" borderRadius="md" mt={4}>
            {error}
          </Box>
        )}

        {recommendation && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={6} data-testid="recommendations">
            {RECOMMENDATION_SECTIONS.map((section) => (
              <Box
                key={section.key}
                borderWidth="1px"
                borderColor={`${section.color}.100`}
                bg={`${section.color}.50`}
                borderRadius="xl"
                p={5}
              >
                <HStack spacing={2} mb={3}>
                  <Icon as={section.icon} color={`${section.color}.600`} />
                  <Text fontWeight="700" color={`${section.color}.800`}>
                    {section.title}
                  </Text>
                </HStack>
                <VStack align="stretch" spacing={2}>
                  {(recommendation[section.key] || []).map((item, index) => (
                    <Text key={index} fontSize="sm" color="gray.700">
                      • {item}
                    </Text>
                  ))}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Panel>
    </VStack>
  );
};

// ------------------------------------------------------------------
// Results
// ------------------------------------------------------------------
const ExamResults = ({ setActiveTab, setSelectedExamId }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/exams")
      .then((response) => setExams(response.data))
      .catch((error) => {
        console.error("Error fetching exams:", error);
        setExams([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Panel p={0} overflow="hidden">
      <Box px={6} pt={6}>
        <PanelTitle title="Exercises and results" subtitle="Every exercise you created and the answer sheets marked for it." />
      </Box>
      {loading ? (
        <Flex justify="center" py={8}>
          <Spinner color="brand.500" />
        </Flex>
      ) : exams.length === 0 ? (
        <Box textAlign="center" py={8} px={6}>
          <Text color="gray.500">No exercises yet. Create one in the exercise chat.</Text>
        </Box>
      ) : (
        <Table>
          <Thead bg="gray.50">
            <Tr>
              <Th>#</Th>
              <Th>Exercise</Th>
              <Th isNumeric>Questions</Th>
              <Th isNumeric>Sheets marked</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {exams.map((exam) => (
              <Tr key={exam.id} _hover={{ bg: "gray.50" }}>
                <Td color="gray.500" fontWeight="600">
                  {exam.id}
                </Td>
                <Td fontWeight="600" color="gray.900">
                  {exam.name}
                </Td>
                <Td isNumeric>{exam.questions}</Td>
                <Td isNumeric>{exam.marked}</Td>
                <Td textAlign="right">
                  <Button
                    data-testid={`view-results-${exam.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setActiveTab("exam-details");
                    }}
                  >
                    View results
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Panel>
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
        const examsResponse = await api.get("/exams");
        const exam = examsResponse.data.find((e) => e.id === examId);
        if (exam) setExamTitle(exam.name);
      } catch (error) {
        console.error("Error fetching exam results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExamResults();
  }, [examId]);

  const statusLabel = { PASSED: "Passed", "NEEDS IMPROVEMENT": "Needs practice", PENDING: "Not validated" };
  const statusColor = { PASSED: "green", "NEEDS IMPROVEMENT": "orange", PENDING: "yellow" };

  return (
    <Panel p={0} overflow="hidden">
      <Flex justify="space-between" align="center" px={6} pt={6} gap={4}>
        <PanelTitle title={examTitle || `Exercise ${examId}`} subtitle={`Results for exercise #${examId}`} />
        <Button
          leftIcon={<FiChevronLeft />}
          variant="ghost"
          colorScheme="gray"
          onClick={() => setActiveTab("results")}
          mb={5}
        >
          All exercises
        </Button>
      </Flex>
      {loading ? (
        <Flex justify="center" py={8}>
          <Spinner color="brand.500" />
        </Flex>
      ) : results.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No answer sheets marked for this exercise yet</Text>
        </Box>
      ) : (
        <Table>
          <Thead bg="gray.50">
            <Tr>
              <Th>Pupil</Th>
              <Th>Score</Th>
              <Th>Submitted on</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {results.map((result, idx) => (
              <Tr key={idx}>
                <Td fontWeight="600">{result.student}</Td>
                <Td>
                  {result.total ? (
                    <Text>
                      <b>
                        {result.correct}/{result.total}
                      </b>{" "}
                      <Text as="span" color="gray.500">
                        ({result.score}%)
                      </Text>
                    </Text>
                  ) : (
                    `${result.score}%`
                  )}
                </Td>
                <Td>{result.submission_date}</Td>
                <Td>
                  <Badge
                    colorScheme={statusColor[result.status] || "gray"}
                    borderRadius="full"
                    px={2.5}
                    textTransform="none"
                  >
                    {statusLabel[result.status] || result.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Panel>
  );
};

// ------------------------------------------------------------------
// Overview (default tab)
// ------------------------------------------------------------------
const Overview = ({ user, setActiveTab, setSelectedExamId, navigate }) => {
  const metrics = useMetrics();
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    api.get("/students").then((r) => setStudents(r.data)).catch(() => {});
    api.get("/exams").then((r) => setExams(r.data)).catch(() => {});
  }, []);

  const steps = [
    {
      icon: FiMessageSquare,
      title: "1. Create an exercise",
      text: "Describe what you need in the exercise chat. EducAI writes the quiz and its answer key.",
      action: "Open the chat",
      onClick: () => navigate("/"),
    },
    {
      icon: FiCheckCircle,
      title: "2. Mark answer sheets",
      text: "Upload a pupil's PDF answer sheet. Check the marks, adjust any of them, then validate.",
      action: "Mark a sheet",
      onClick: () => setActiveTab("correct-exam"),
    },
    {
      icon: FiTrendingUp,
      title: "3. Get recommendations",
      text: "See each pupil's strengths, the skills to practise and concrete next steps.",
      action: "Open insights",
      onClick: () => setActiveTab("insights"),
    },
  ];

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="lg" color="gray.900" letterSpacing="-0.02em">
          Welcome back{user?.nom ? `, ${user.nom.split(" ")[0]}` : ""}
        </Heading>
        <Text color="gray.500" mt={1}>
          Here is how your class is doing.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={5}>
        <StatCard icon={FiBarChart2} label="Average score" value={`${Math.round(metrics.averageScore)}%`} />
        <StatCard icon={FiCheckCircle} label="Sheets marked" value={metrics.examsCorrected} color="green" />
        <StatCard icon={FiUsers} label="Pupils" value={students.length} color="blue" />
        <StatCard icon={FiFileText} label="Exercises created" value={exams.length} color="purple" />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5}>
        {steps.map((step) => (
          <Panel key={step.title} display="flex" flexDirection="column" alignItems="flex-start">
            <Icon as={step.icon} boxSize={6} color="brand.500" mb={3} />
            <Text fontWeight="700" color="gray.900" mb={1}>
              {step.title}
            </Text>
            <Text fontSize="sm" color="gray.600" mb={4}>
              {step.text}
            </Text>
            <Button size="sm" variant="outline" mt="auto" onClick={step.onClick}>
              {step.action}
            </Button>
          </Panel>
        ))}
      </SimpleGrid>

      <Panel p={0} overflow="hidden">
        <Flex justify="space-between" align="center" px={6} py={4}>
          <Heading size="sm" color="gray.900">
            Recent exercises
          </Heading>
          <Button size="sm" variant="ghost" onClick={() => setActiveTab("results")}>
            See all
          </Button>
        </Flex>
        {exams.length === 0 ? (
          <Text color="gray.500" px={6} pb={6}>
            No exercises yet.
          </Text>
        ) : (
          <Table>
            <Thead bg="gray.50">
              <Tr>
                <Th>#</Th>
                <Th>Exercise</Th>
                <Th isNumeric>Questions</Th>
                <Th isNumeric>Sheets marked</Th>
              </Tr>
            </Thead>
            <Tbody>
              {exams.slice(0, 5).map((exam) => (
                <Tr
                  key={exam.id}
                  _hover={{ bg: "gray.50" }}
                  cursor="pointer"
                  onClick={() => {
                    setSelectedExamId(exam.id);
                    setActiveTab("exam-details");
                  }}
                >
                  <Td color="gray.500" fontWeight="600">
                    {exam.id}
                  </Td>
                  <Td fontWeight="600">{exam.name}</Td>
                  <Td isNumeric>{exam.questions}</Td>
                  <Td isNumeric>{exam.marked}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Panel>
    </VStack>
  );
};

// ------------------------------------------------------------------
// Layout
// ------------------------------------------------------------------
const NAV_ITEMS = [
  { name: "Dashboard", icon: FiHome, id: "dashboard" },
  { name: "Exercise chat", icon: FiMessageSquare, id: "homepage" },
  { name: "Mark Exam", icon: FiCheckCircle, id: "correct-exam" },
  { name: "Insights", icon: FiBarChart2, id: "insights" },
  { name: "Results", icon: FiFileText, id: "results" },
  { name: "Curriculum", icon: FiUpload, id: "curriculum" },
  { name: "Profile", icon: FiUser, id: "profile" },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  "correct-exam": "Mark Exam",
  insights: "Insights",
  results: "Results",
  "exam-details": "Results",
  profile: "Profile",
  curriculum: "Curriculum",
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
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
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
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [navigate, toast]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Verify authentication and fetch the user profile
  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.get("/me/");
        setUser(response.data);
      } catch (error) {
        console.error("Authentication error:", error);
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
      } finally {
        setIsLoading(false);
      }
    };
    verifyAuth();
  }, [isAuthenticated, navigate, toast]);

  const selectTab = (id) => {
    if (id === "homepage") {
      navigate("/");
      return;
    }
    setActiveTab(id);
  };

  const SidebarContent = ({ onItemClick, ...rest }) => (
    <Flex
      direction="column"
      bg="white"
      borderRight="1px"
      borderRightColor="gray.200"
      w={{ base: "full", md: SIDEBAR_WIDTH }}
      pos="fixed"
      top={0}
      left={0}
      h="100vh"
      zIndex="20"
      {...rest}
    >
      <Flex h="72px" align="center" px={6}>
        <Logo onClick={() => navigate("/")} />
      </Flex>
      <VStack spacing={1} align="stretch" mt={4} px={3} flex="1">
        {NAV_ITEMS.map((item) => {
          const active =
            activeTab === item.id || (item.id === "results" && activeTab === "exam-details");
          return (
            <Flex
              key={item.id}
              data-testid={`nav-${item.id}`}
              align="center"
              px={4}
              py={2.5}
              borderRadius="lg"
              cursor="pointer"
              fontWeight={active ? "600" : "500"}
              bg={active ? "brand.50" : "transparent"}
              color={active ? "brand.700" : "gray.600"}
              _hover={{ bg: active ? "brand.50" : "gray.100", color: active ? "brand.700" : "gray.900" }}
              onClick={() => {
                selectTab(item.id);
                if (typeof onItemClick === "function") onItemClick();
              }}
            >
              <Icon mr={3} boxSize="18px" as={item.icon} />
              {item.name}
            </Flex>
          );
        })}
      </VStack>
      <HStack spacing={3} p={4} m={3} borderRadius="lg" bg="gray.50">
        <Avatar size="sm" name={user ? user.nom : "User"} bg="brand.500" color="white" />
        <Box minW={0}>
          <Text fontWeight="600" fontSize="sm" noOfLines={1}>
            {user ? user.nom : "User"}
          </Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {user ? user.email : ""}
          </Text>
        </Box>
      </HStack>
    </Flex>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "correct-exam":
        return <CorrectExam />;
      case "insights":
        return <Insights />;
      case "results":
        return <ExamResults setActiveTab={setActiveTab} setSelectedExamId={setSelectedExamId} />;
      case "exam-details":
        return <ExamDetails examId={selectedExamId} setActiveTab={setActiveTab} />;
      case "profile":
        return (
          <Panel maxW="520px">
            <HStack spacing={5}>
              <Avatar size="xl" name={user ? user.nom : "User"} bg="brand.500" color="white" />
              <Box>
                <Text fontSize="xl" fontWeight="700">
                  {user ? user.nom : "User"}
                </Text>
                <Text color="gray.500">{user ? user.email : "user@example.com"}</Text>
                <Badge mt={2} colorScheme="brand" textTransform="none">
                  Teacher
                </Badge>
              </Box>
            </HStack>
          </Panel>
        );
      case "curriculum":
        return <CurriculumUpload />;
      default:
        return (
          <Overview
            user={user}
            setActiveTab={setActiveTab}
            setSelectedExamId={setSelectedExamId}
            navigate={navigate}
          />
        );
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {isLoading ? (
        <Flex height="100vh" width="100%" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Text fontSize="xl">Loading dashboard...</Text>
            <Progress size="xs" isIndeterminate width="200px" colorScheme="brand" />
          </VStack>
        </Flex>
      ) : (
        <>
          <SidebarContent display={{ base: "none", md: "flex" }} />

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
              <SidebarContent onItemClick={onClose} />
            </DrawerContent>
          </Drawer>

          <Box ml={{ base: 0, md: SIDEBAR_WIDTH }}>
            <Flex
              as="header"
              h="72px"
              align="center"
              px={{ base: 4, md: 8 }}
              bg="white"
              borderBottomWidth="1px"
              borderBottomColor="gray.200"
              position="sticky"
              top="0"
              zIndex="10"
              gap={4}
            >
              <IconButton
                variant="outline"
                onClick={onOpen}
                aria-label="open menu"
                icon={<FiMenu />}
                display={{ md: "none" }}
              />
              <Text fontSize="xl" fontWeight="700" color="gray.900">
                {PAGE_TITLES[activeTab] || "Dashboard"}
              </Text>
              <Button ml="auto" size="sm" leftIcon={<FiPlus />} onClick={() => navigate("/")}>
                New exercise
              </Button>
            </Flex>
            <Box p={{ base: 4, md: 8 }} maxW="1400px">
              {renderContent()}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default DashboardLayout;
