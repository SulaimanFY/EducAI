# 📘 EducAI — AI-Powered Pedagogical Assistance Platform

**EducAI** is a web application that uses artificial intelligence to help teachers generate and automatically correct mathematics exercises. It combines a modern backend–frontend architecture, intelligent content generation, PDF exam correction, dashboards, analytics, and personalized pedagogical recommendations.

The project was developed by **Sulaiman FAYYAZ** and **Kamul ALI NASSOMA WATTARA** as a final-year **Master of Engineering** project. The full technical documentation and user guide are available in French.

---

## 🌟 Key Features

### AI-Based Exercise Generation

EducAI can generate mathematics exercises from natural-language prompts or based on uploaded curriculum documents. Typical requests include:

- simple arithmetic exercises  
- word problems  
- geometry exercises  
- multiple-choice questions (QCM)

Teachers can specify:

- school level (CP, CE1, CE2)  
- type of exercise (QCM, problems, simple questions)  
- number of questions  
- difficulty level  
- specific topic or theme  

All of this is done through an interactive AI chat interface on the home page.

---

### Automatic Correction of Student Copies (PDF)

EducAI can automatically correct student answer sheets submitted as PDF files:

- PDFs must follow a simple structure (student ID, exercise ID, date, list of answers).  
- The system extracts the answers, compares them with the expected solution, and computes:  
  - global score  
  - detailed list of correct and incorrect answers  
  - success percentage  

Teachers can manually edit each answer’s score (0 or 1) before validating. Once validated, the results are saved and associated with the corresponding student.

---

### Interactive Chat Interface

The main page of EducAI provides an AI chat:

- message input area at the bottom  
- conversation history in the main panel  
- navigation bar to move between sections  

Through this chat, teachers can ask the AI to generate new exercises, refine existing ones, or adapt content to a particular curriculum or level.

---

### Dashboard and Analytics

The dashboard offers an overview of the activity and performance within the application:

- total number of students  
- number of created exercises  
- average student performance  
- list of recently created exercises  

From the sidebar, teachers can access:

- **Dashboard** — overview and statistics  
- **Correct Exam** — upload and correct PDF copies  
- **Analyses** — detailed statistics and recommendations  
- **Results** — list of exams and results  
- **Profile** — account information  
- **Curriculum** — upload of school programs  

---

### Personalized Student Recommendations

For each student, EducAI can generate personalized recommendations to help guide future learning:

- strengths (skills already mastered)  
- points to improve (skills requiring more work)  
- pedagogical advice  
- suggestions for additional exercises and learning resources  

These recommendations can be shared with students or parents and used to adapt teaching strategies.

---

## 🧠 System Architecture

EducAI follows a classic client–server architecture with a clear separation of concerns between frontend, backend, AI services, and the database.

High-level flow:

- The user interacts with the **React** frontend.  
- The frontend sends HTTP requests to the **FastAPI** backend.  
- The backend calls **OpenAI GPT** for exercise generation, correction, and recommendations when needed.  
- Data (users, exercises, results, etc.) is persisted in a **SQLite** database.  
- The backend sends responses back to the frontend, which updates the user interface.

### Main Technologies

- **Backend:** Python / FastAPI  
- **Frontend:** React (JavaScript) with Chakra UI  
- **Database:** SQLite  
- **AI:** OpenAI GPT models (via OpenAI API)  
- **Containerization:** Docker and Docker Compose  

---

## 🗂️ Backend Structure

The backend lives in the `backend/` directory and is implemented with FastAPI and SQLAlchemy.

Typical structure:

- `server.py` — API entrypoint, route definitions, middleware, authentication.  
- `database.py` — database connection and SQLAlchemy session management.  
- `models.py` — ORM models for all entities (Professors, Students, Programs, Exercises, QCM, QCM responses, Submissions, Results, etc.).  
- `llm_agent.py` — integration with the OpenAI API (generation of exercises, analysis of student copies, recommendation generation).  
- `utils.py` — utility functions such as PDF text extraction and data transformations.  
- `submissions/` — directory used to store uploaded student PDF copies.  
- `uploads/` — directory used to store uploaded curriculum files.  
- `requirements.txt` — Python dependencies.  
- `Dockerfile` — container configuration for the backend service.

### AI Components

Some key AI helper functions:

- `invoke_generate_qcm_agent` — generates exercises and QCM from prompts and curriculum.  
- `invoke_analyze_student_copy_agent` — analyses student submissions and computes scores.  
- `invoke_llm_recommendation_agent` — produces student-specific recommendations.

These functions encapsulate prompt engineering and communication with OpenAI GPT.

---

## 🎨 Frontend Structure

The frontend is built with React and Chakra UI in the `eduiafront/` directory.

Typical structure:

- `src/assets/` — images and icons.  
- `src/Auth/` — authentication components (login, registration).  
- `src/Chat/` — chat interface with the AI.  
- `src/Layout/` — dashboard layout components.  
- `src/common/` — shared UI components.  
- `src/pages/` — main views (home, dashboard, results, etc.).  
- `src/services/` — HTTP service wrappers (Axios) for calling the FastAPI backend.  
- `App.jsx` — root component.  
- `main.jsx` — application entrypoint.  
- `public/` — static assets.  
- `package.json` — JavaScript dependencies.  
- `Dockerfile` — container configuration for the frontend.

The UI is divided into:

- **Home / Chat** — main chat with the AI.  
- **Dashboard** — statistics and KPIs.  
- **Correct Exam** — upload and correction workflow.  
- **Analyses** — detailed performance and recommendations.  
- **Results** — list of exams and student scores.  
- **Curriculum** — upload area for school programs.  
- **Profile** — user account information.

---

## 📦 Data Model

EducAI uses a relational model implemented with SQLAlchemy.

Simplified relationships:

- One **Professor** can create many **Exercises**.  
- Each **Exercise** can contain multiple **QCM** questions, each with multiple **QCMResponse** options.  
- One **Student** can have many **Submissions**, each producing multiple **Result** records.  
- **Program** (curriculum) links exercises to a specific school program.

Main tables:

- `Professor` — teacher accounts.  
- `Student` — student information.  
- `Program` — school program and curriculum information.  
- `Exercise` — generated or saved exercises.  
- `QCM` and `QCMResponse` — multiple-choice questions and answer options.  
- `Submission` — student exam submissions (linked to PDFs).  
- `Result` — detailed grading results.

---

## ⚙️ API Overview

The FastAPI backend exposes REST endpoints organized by resource. Examples:

- `POST /register/` — teacher registration.  
- `POST /login/` — authentication and JWT issuance.  
- `GET /me/` — fetch current authenticated user profile.  
- `POST /chat/` — send a prompt to the AI chat for exercise generation.  
- `POST /correct-exam/` — upload and correct a student PDF exam.  
- `POST /save-result/` — save corrected exam results.  
- `POST /upload-curriculum/` — upload a curriculum/program file.  
- `GET /students` — list registered or detected students.  
- `GET /exercises` — list created exercises.  
- `GET /metrics` — fetch dashboard statistics.  
- `GET /exams` — list exams.  
- `GET /recommendations/student/{id}` — generate and return recommendations for a student.

Authentication is based on **JSON Web Tokens (JWT)**:

- tokens are sent as Bearer tokens in the `Authorization` header;  
- lifetime is typically 60 minutes;  
- only authenticated users can access teacher-specific resources.

---

## 🔐 Security

Security measures implemented in EducAI include:

- **Password hashing** using bcrypt.  
- **JWT-based authentication and authorization** for all protected endpoints.  
- **Input validation** with Pydantic models to guard against malformed data.  
- **Escaping and safe rendering** on the frontend side.  
- **Minimal storage of personal data** and separation of sensitive information to align with GDPR-style privacy principles.

---

## 🐳 Deployment with Docker

EducAI is designed to be run via Docker and Docker Compose.

There are two main services:

- `api` — backend FastAPI service, exposed on port `8000`.  
- `frontend` — React application, served on port `3000`.

A typical `docker-compose.yml` (simplified):

- builds the backend from `./backend` and mounts the backend directory.  
- builds the frontend from `./eduiafront` and exposes it via an Nginx or static server container.  
- passes environment variables such as `OPENAI_API_KEY` to the backend.

### Running the Application

1. Make sure **Docker** and **Docker Compose** are installed.  
2. Set the `OPENAI_API_KEY` variable in an `.env` file or your environment.  
3. From the project root, run:

   - `docker-compose up --build`

4. Open your browser at:

   - Frontend: `http://localhost:3000`  
   - Backend API (for testing): `http://localhost:8000`

---

## 🧪 Known Limitations and Technical Considerations

Some current limitations and considerations:

- **SQLite** is used for simplicity but is not ideal for high-concurrency production environments.  
- The deployment currently targets a **single instance** (no built-in high availability).  
- The system depends on **OpenAI API** limits (quotas, latency, availability).  
- **Automated tests** exist but are not yet fully comprehensive.  

Performance considerations:

- indexes can be used to optimize frequent queries;  
- frontend uses lazy loading to improve responsiveness.

---

## 🔮 Possible Future Improvements

Planned or potential enhancements:

- migrate from SQLite to **PostgreSQL** for better scalability and robustness;  
- implement a richer **automated test suite** (unit, integration, end-to-end);  
- add **caching** for frequently repeated AI queries;  
- use a dedicated object store (e.g., **S3/MinIO**) for file storage;  
- introduce **WebSockets** for real-time updates (live corrections, notifications).

---

## 📥 Installation (Development Environment)

Although Docker is the recommended way to run EducAI, a classic development setup would follow this pattern:

1. **Backend**
   - create and activate a Python virtual environment;  
   - install dependencies with `pip install -r requirements.txt`;  
   - set the `OPENAI_API_KEY` environment variable;  
   - run the FastAPI app with `uvicorn server:app --reload`.

2. **Frontend**
   - navigate to the `eduiafront` directory;  
   - install dependencies with `npm install` or `yarn`;  
   - run `npm run dev` or `yarn dev` and access the local development URL.

(Exact commands may vary depending on how you configure the repo; Docker remains the reference way.)

---

## 👨‍🏫 Target Users

EducAI is aimed at:

- teachers who want to quickly generate customized mathematics exercises;  
- professors who need automatic correction of student copies;  
- educators who want tools to analyze student performance and adapt teaching.

---

## 👥 Authors

- **Sulaiman FAYYAZ**  
- **Kamul ALI NASSOMA WATTARA**

Final-year **Master of Engineering** project (2025).

