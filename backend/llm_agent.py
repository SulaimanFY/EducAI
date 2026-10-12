# llm_agent.py
import json
import logging
import os
import random
import re

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

from models import Programme, Recommendation

logger = logging.getLogger(__name__)

llm = ChatOpenAI(
    model_name=os.environ.get("OPENAI_MODEL", "gpt-4o"),
    temperature=0.7,
    max_tokens=4000
)

# Default curriculum shipped with the app (French national curriculum, Cycle 2).
DEFAULT_CURRICULUM_PDF = "program/cycle2_maths.pdf"
DEFAULT_CURRICULUM_SUMMARY = (
    "Primary school mathematics for ages 6 to 8 (Grades 1 to 3; Cycle 2 of the "
    "French national curriculum: CP, CE1, CE2), covering numbers, calculation, "
    "geometry and measurement."
)

QCM_PROMPT_TEMPLATE = PromptTemplate(
    input_variables=["programme"],
    template="""
Role:
You are a teaching assistant specialised in mathematics for young primary pupils
(ages 6 to 8, Grades 1 to 3). Your goal is to create varied multiple-choice
exercises that cover the curriculum in a playful, engaging way.

Rules for every multiple-choice question:
- One question and exactly 4 answer options (A, B, C, D).
- Exactly one option is correct.
- The context is playful and suited to children aged 6 to 8.
- The exercise must follow this request and curriculum: {programme}

Guidelines:
1. Variety and creativity
   - Do not repeat the same kind of question twice in a row.
   - Use concrete situations children know (counting marbles, sharing sweets,
     shopping at the market, measuring everyday objects...).
   - Vary the settings (school, adventure, stories, animals, sport, travel).

2. Stay within the curriculum
   - Numbers (compare, order, write numbers in words).
   - Calculation (addition, subtraction, simple multiplication, doubles and halves).
   - Quantities and measurement (time, money, length, mass).
   - Geometry (shapes, symmetry, drawing, position in space).
   - Logic problems (small puzzles suited to the age group).

3. Format
   - Write in clear, simple English that a young child can follow.
   - Use whole numbers and amounts in the answer options, not letters.
   - Unless the teacher asks for a different number, write 5 questions.

4. Correct answer key
   - For each question, first write the full working in "working"
     (for example "50 - 12 = 38"), then mark as correct the one option that
     matches that result. Check every calculation twice.
   - The three wrong options must be plausible but clearly wrong.

Politely decline anything that is not primary maths for ages 6 to 8. In that
case, still answer with the JSON below, with an empty "qcm" list and the
"contenu" field set to: "I can only create maths exercises for pupils aged 6 to 8.
Which maths topic would you like a quiz on?"

Answer with JSON only, in this exact format:
{{
    "titre": "Exercise title",
    "contenu": "Short story or context that introduces the exercise",
    "qcm": [
        {{
            "question": "question text",
            "id_qcm": "Q1",
            "working": "the calculation or reasoning that gives the answer",
            "reponses": [
                {{"texte": "option A", "est_correct": false, "lettre": "A"}},
                {{"texte": "option B", "est_correct": false, "lettre": "B"}},
                {{"texte": "option C", "est_correct": true, "lettre": "C"}},
                {{"texte": "option D", "est_correct": false, "lettre": "D"}}
            ]
        }}
    ]
}}
"""
)


def _parse_json_output(raw_output):
    """Extract the first JSON object from an LLM answer (with or without a code fence)."""
    if not raw_output:
        raise ValueError("The AI returned an empty answer. Check the model and the prompt.")

    json_blocks = re.findall(r"```(?:json)?\s*\n(.*?)\n```", raw_output, re.DOTALL)
    json_content = json_blocks[0].strip() if json_blocks else raw_output.strip()

    try:
        return json.loads(json_content)
    except json.JSONDecodeError as e:
        logger.warning("JSON parse error: %s. Trying balanced-braces fallback.", e)
        depth = 0
        start_pos = json_content.find("{")
        if start_pos >= 0:
            for i in range(start_pos, len(json_content)):
                if json_content[i] == "{":
                    depth += 1
                elif json_content[i] == "}":
                    depth -= 1
                    if depth == 0:
                        return json.loads(json_content[start_pos : i + 1])
        raise ValueError(f"Could not parse the AI answer as JSON: {e}")


def _retrieve_curriculum_context(retriever, query, k=3):
    """Return the most relevant curriculum passages for a teacher request."""
    try:
        documents = retriever.invoke(query)
    except Exception as e:
        logger.warning("Curriculum retrieval failed: %s", e)
        return ""
    return "\n\n".join(doc.page_content for doc in documents[:k])


def invoke_generate_qcm_agent(prompt, professeur_id, db):
    # Use the teacher's uploaded curriculum when there is one, otherwise the
    # curriculum PDF shipped with the app.
    retriever = get_professor_curriculum(professeur_id, db) or load_pdf_curriculum(
        DEFAULT_CURRICULUM_PDF
    )
    curriculum_context = (
        _retrieve_curriculum_context(retriever, prompt) if retriever else ""
    ) or DEFAULT_CURRICULUM_SUMMARY

    programme_complet = (
        f"Teacher's request: {prompt}\n\n"
        f"Relevant curriculum extracts:\n{curriculum_context}"
    )

    chain = QCM_PROMPT_TEMPLATE | llm | StrOutputParser()
    qcm_data = _parse_json_output(chain.invoke({"programme": programme_complet}))

    # Keep only well-formed questions: options present and exactly one marked correct.
    valid_questions = []
    for question in qcm_data.get("qcm", []) or []:
        options = question.get("reponses", [])
        if options and sum(bool(o.get("est_correct")) for o in options) == 1:
            valid_questions.append(question)
        else:
            logger.warning("Dropping malformed question: %s", question.get("question"))
    for number, question in enumerate(valid_questions, start=1):
        question["id_qcm"] = f"Q{number}"
        # Models tend to put the right answer in the same slot; shuffle the
        # options so its letter varies, then re-letter them A, B, C, D.
        random.shuffle(question["reponses"])
        for letter, option in zip("ABCDEFGH", question["reponses"]):
            option["lettre"] = letter
    qcm_data["qcm"] = valid_questions
    return qcm_data


def format_qcm_data(qcm_data, new_exercise):
    """Render a generated exercise as readable text for the chat.

    The exercise is already structured, so it is formatted directly instead of
    asking the model a second time: faster, cheaper, and the correct answers
    shown are exactly the ones stored in the database.
    """
    lines = [
        f"### Exercise {new_exercise.id}: {qcm_data.get('titre', '').strip()}",
    ]
    intro = (qcm_data.get("contenu") or "").strip()
    if intro:
        lines.append(f"Introduction: {intro}")

    for number, question in enumerate(qcm_data.get("qcm", []), start=1):
        lines.append(f"Question {number}: {question['question'].strip()}")
        correct = None
        for option in question.get("reponses", []):
            lines.append(f"{option['lettre']}) {option['texte']}")
            if option.get("est_correct"):
                correct = option
        if correct:
            lines.append(f"Correct answer: {correct['lettre']}) {correct['texte']}")

    return "\n".join(lines)


EXTRACTION_PROMPT = PromptTemplate(
    input_variables=["texte_extrait"],
    template="""
Read the text below, taken from a pupil's answer sheet, and structure it as JSON.
Find:
- the pupil ID
- the exercise ID
- the pupil's name
- the submission date (YYYY-MM-DD)
- the answer given to each question

Write each question identifier as "Q" followed by its number ("Q1", "Q2", ...),
and each answer as the single letter the pupil chose (A, B, C or D).

Extracted text:
{texte_extrait}

Expected answer (JSON only):
{{
  "id_eleve": "",
  "nom_eleve": "",
  "id_exercice": "",
  "date_soumission": "",
  "reponses": [
    {{"question": "Q1", "reponse_choisie": "A"}},
    {{"question": "Q2", "reponse_choisie": "B"}}
  ]
}}
""",
)


def _normalise_answers(structured_data):
    """Make question ids and letters match the stored answer key ("Q1", "A")."""
    for answer in structured_data.get("reponses", []) or []:
        question = str(answer.get("question", "")).strip()
        digits = re.sub(r"\D", "", question)
        if digits:
            answer["question"] = f"Q{int(digits)}"
        letter = str(answer.get("reponse_choisie", "")).strip().upper()
        answer["reponse_choisie"] = letter[:1]
    return structured_data


def invoke_analyze_student_copy_agent(text: str):
    chain = EXTRACTION_PROMPT | llm | StrOutputParser()
    raw_output = chain.invoke({"texte_extrait": text})
    return _normalise_answers(_parse_json_output(raw_output))


def invoke_llm_recommendation_agent(student_name, student_email, performance_details):
    """Generate personalised recommendations for a pupil based on their results."""
    parser = PydanticOutputParser(pydantic_object=Recommendation)

    student_recommendation_template = PromptTemplate(
        input_variables=["nom_eleve", "email", "performance_details"],
        template="""
You are a teaching assistant who helps teachers understand each pupil's strengths
and weaknesses.

Pupil: {nom_eleve} {email}

Results per exercise:
{performance_details}

Based on these results, write personalised recommendations to help this pupil
progress. They must be specific, actionable and suited to a child aged 6 to 8.
Stick strictly to the scores given. If the score is 2/4, never say the pupil got
everything right. Strengths must only mention skills the results actually show.
Areas to improve must reflect the mistakes or the partial score.
Be concrete: for each wrong answer, first work out the calculation the question
needs and compare it with the pupil's answer, then name the skill and the likely
mistake (for example "50 - 30: answered 10, one ten too many taken away").
Quote the question number and the calculation. Only call something "crossing a ten"
or "regrouping" when the ones digit of the first number is smaller than the ones
digit of the number taken away (24 - 8 crosses a ten, 70 - 20 does not).
Keep each point to one or two short sentences a teacher can act on, and suggest
resources a teacher can find or make easily (no invented links or website names).
Write in English.

{format_instructions}
""",
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

    chain = student_recommendation_template | llm.bind(temperature=0.2) | parser
    return chain.invoke({
        "nom_eleve": student_name,
        "email": student_email,
        "performance_details": performance_details
    })


# ======================================================
# PDF CURRICULUM LOADER
# ======================================================
_retriever_cache = {}


def load_pdf_curriculum(pdf_path):
    """Index a curriculum PDF for retrieval. Indexes are cached per file version."""
    if not pdf_path or not os.path.exists(pdf_path):
        return None

    cache_key = (os.path.abspath(pdf_path), os.path.getmtime(pdf_path))
    if cache_key in _retriever_cache:
        return _retriever_cache[cache_key]

    try:
        documents = PyPDFLoader(pdf_path).load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_documents(documents)
        vectorstore = FAISS.from_documents(
            chunks,
            # Chunks are short, so skip tiktoken length checks (no tokenizer download needed).
            OpenAIEmbeddings(check_embedding_ctx_length=False),
        )
    except Exception as e:
        logger.exception("Could not index curriculum %s: %s", pdf_path, e)
        return None

    retriever = vectorstore.as_retriever()
    _retriever_cache[cache_key] = retriever
    return retriever


def get_professor_curriculum(professeur_id, db):
    """Return a retriever over the teacher's uploaded curriculum, or ``None``."""
    try:
        result = (
            db.query(Programme)
            .filter(Programme.professeur_id == professeur_id)
            .first()
        )
        if result and result.file_path:
            return load_pdf_curriculum(result.file_path)
        return None
    except Exception as e:
        logger.exception("Error fetching teacher curriculum: %s", e)
        return None
