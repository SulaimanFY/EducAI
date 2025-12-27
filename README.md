# EducAI — AI-Powered Pedagogical Assistance Platform

## Overview
**EducAI** is a web application that uses artificial intelligence to help teachers generate and automatically correct mathematics exercises. It combines a modern backend–frontend architecture, intelligent content generation, PDF exam correction, dashboards, analytics, and personalized pedagogical recommendations.

This project was developed by **Sulaiman FAYYAZ** and **Kamul ALI NASSOMA WATTARA** as a final-year **Master of Engineering** project (2025). Full technical documentation and a user guide are available in French.

---

## Key Features

### AI-Based Exercise Generation
EducAI can generate mathematics exercises from natural-language prompts or based on uploaded curriculum documents. Supported exercise types include:
- Arithmetic exercises
- Word problems
- Geometry exercises
- Multiple-choice questions (QCM)

Teachers can specify:
- School level (CP, CE1, CE2)
- Exercise type (QCM, problems, short questions)
- Number of questions
- Difficulty level
- Topic or theme

All interactions are done through an interactive AI chat interface on the home page.

### Automatic Correction of Student Copies (PDF)
EducAI can automatically correct student answer sheets submitted as PDF files:
- PDFs must follow a simple structure (student ID, exercise ID, date, list of answers).
- The system extracts answers, compares them with expected solutions, and computes:
  - Global score
  - Detailed list of correct and incorrect answers
  - Success percentage

Teachers can manually edit each answer’s score (0 or 1) before validating. Once validated, results are saved and associated with the corresponding student.

### Interactive Chat Interface
The main page provides an AI chat:
- Message input area at the bottom
- Conversation history in the main panel
- Navigation bar to move between sections

Through this chat, teachers can generate new exercises, refine existing ones, or adapt content to a particular curriculum or level.

### Dashboard and Analytics
The dashboard offers an overview of activity and performance:
- Total number of students
- Number of created exercises
- Average student performance
- Recently created exercises

From the sidebar, teachers can access:
- Dashboard — overview and statistics
- Correct Exam — upload and correct PDF copies
- Analyses — detailed statistics and recommendations
- Results — list of exams and results
- Profile — account information
- Curriculum — upload of school programs

### Personalized Student Recommendations
For each student, EducAI can generate personalized recommendations to guide learning:
- Strengths (skills already mastered)
- Points to improve (skills requiring more work)
- Pedagogical advice
- Suggestions for additional exercises and learning resources

These recommendations can be shared with students or parents and used to adapt teaching strategies.

---

## System Architecture
EducAI follows a classic client–server architecture with a clear separation of concerns between frontend, backend, AI services, and the database.

High-level flow:
1. The user interacts with the **React** frontend.
2. The frontend sends HTTP requests to the **FastAPI** backend.
3. The backend calls **OpenAI GPT** for exercise generation, correction, and recommendations when needed.
4. Data (users, exercises, results, etc.) is persisted in a **SQLite** database.
5. The backend sends responses back to the frontend, which updates the user interface.

### Main Technologies
- **Backend:** Python / FastAPI
- **Frontend:** React (JavaScript) with Chakra UI
- **Database:** SQLite
- **AI:** OpenAI GPT models (via OpenAI API)
- **Containerization:** Docker and Docker Compose

---

## Backend Structure
The backend lives in the `backend/` directory and is implemented with FastAPI and SQLAlchemy.

Typical structure:
- `server.py` — API entrypoint, route definitions, middleware, authentication
- `database.py` — database connection and SQLAlchemy session management
- `models.py` — ORM models for all entities (Professors, Students, Programs, Exercises, QCM, QCM responses, Submissions, Results, etc.)
- `llm_agent.py` — integration with the OpenAI API (generation of exercises, analysis of student copies, recommendation generation)
- `utils.py` — utility functions such as PDF text extraction and data transformations
- `submissions/` — directory used to store uploaded student PDF copies
- `uploads/` — directory used to store uploaded curriculum files
- `requirements.txt` — Python dependencies
- `Dockerfile` — container configuration for the backend service

### AI Components
Key AI helper functions:
- `invoke_generate_qcm_agent` — generates exercises and QCM from prompts and curriculum
- `invoke_analyze_student_copy_agent` — analyses student submissions and computes scores
- `invoke_llm_recommendation_agent` — produces student-specific recommendations

These functions encapsulate prompt engineering and communication with OpenAI GPT.

---

## Frontend Structure
The frontend is built with React and Chakra UI in the `eduiafront/` directory.

Typical structure:
- `src/assets/` — images and icons
- `src/Auth/` — authentication components (login, registration)
- `src/Chat/` — chat interface with the AI
- `src/Layout/` — dashboard layout components
- `src/common/` — shared UI components
- `src/pages/` — main views (home, dashboard, results, etc.)
- `src/services/` — HTTP service wrappers (Axios) for calling the FastAPI backend
- `App.jsx` — root component
- `main.jsx` — application entrypoint
- `public/` — static assets
- `package.json` — JavaScript dependencies
- `Dockerfile` — container configuration for the frontend

The UI is divided into:
- Home / Chat — main chat with the AI
- Dashboard — statistics and KPIs
- Correct Exam — upload and correction workflow
- Analyses — detailed performance and recommendations
- Results — list of exams and student scores
- Curriculum — upload area for school programs
- Profile — user account information

---

## Data Model
EducAI uses a relational model implemented with SQLAlchemy.

Simplified relationships:
- One **Professor** can create many **Exercises**
- Each **Exercise** can contain multiple **QCM** questions, each with multiple **QCMResponse** options
- One **Student** can have many **Submissions**, each producing multiple **Result** records
- **Program** (curriculum) links exercises to a specific school program

Main tables:
- `Professor` — teacher accounts
- `Student` — student information
- `Program` — school program and curriculum information
- `Exercise` — generated or saved exercises
- `QCM` and `QCMResponse` — multiple-choice questions and answer options
- `Submission` — student exam submissions (linked to PDFs)
- `Result` — detailed grading results

---

## API Overview
The FastAPI backend exposes REST endpoints organized by resource. Examples:
- `POST /register/` — teacher registration
- `POST /login/` — authentication and JWT issuance
- `GET /me/` — fetch current authenticated user profile
- `POST /chat/` — send a prompt to the AI chat for exercise generation
- `POST /correct-exam/` — upload and correct a student PDF exam
- `POST /save-result/` — save corrected exam results
- `POST /upload-curriculum/` — upload a curriculum/program file
- `GET /students` — list registered or detected students
- `GET /exercises` — list created exercises
- `GET /metrics` — fetch dashboard statistics
- `GET /exams` — list exams
- `GET /recommendations/student/{id}` — generate and return recommendations for a student

### Authentication
Authentication is based on **JSON Web Tokens (JWT)**:
- Tokens are sent as Bearer tokens in the `Authorization` header
- Token lifetime is typically 60 minutes
- Only authenticated users can access teacher-specific resources

---

## Security
Security measures implemented in EducAI include:
- Password hashing using bcrypt
- JWT-based authentication and authorization for all protected endpoints
- Input validation with Pydantic models to guard against malformed data
- Escaping and safe rendering on the frontend side
- Minimal storage of personal data and separation of sensitive information to align with privacy best practices

---

## Deployment with Docker
EducAI is designed to be run via Docker and Docker Compose.

There are two main services:
- `api` — backend FastAPI service, exposed on port `8000`
- `frontend` — React application, served on port `3000`

A typical `docker-compose.yml` (simplified):
- Builds the backend from `./backend` and mounts the backend directory
- Builds the frontend from `./eduiafront` and exposes it via an Nginx or static server container
- Passes environment variables such as `OPENAI_API_KEY` to the backend

### Running the Application
1. Make sure Docker and Docker Compose are installed.
2. Set the `OPENAI_API_KEY` variable in an `.env` file or your environment.
3. From the project root, run:
   ```bash
   docker-compose up --build
   ```
4. Open your browser at:
   - Frontend: `http://localhost:3000`
   - Backend API (for testing): `http://localhost:8000`

---

## Known Limitations and Technical Considerations
- SQLite is used for simplicity but is not ideal for high-concurrency production environments.
- The deployment currently targets a single instance (no built-in high availability).
- The system depends on OpenAI API limits (quotas, latency, availability).
- Automated tests exist but are not yet fully comprehensive.

Performance considerations:
- Indexes can be used to optimize frequent queries.
- The frontend uses lazy loading to improve responsiveness.

---

## Possible Future Improvements
Planned or potential enhancements:
- Migrate from SQLite to PostgreSQL for better scalability and robustness.
- Implement a richer automated test suite (unit, integration, end-to-end).
- Add caching for frequently repeated AI queries.
- Use a dedicated object store (e.g., S3/MinIO) for file storage.
- Introduce WebSockets for real-time updates (live corrections, notifications).

---

## Installation (Development Environment)
Although Docker is the recommended way to run EducAI, a classic development setup typically follows this pattern.

### Backend
1. Create and activate a Python virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set the `OPENAI_API_KEY` environment variable.
4. Run the FastAPI app:
   ```bash
   uvicorn server:app --reload
   ```

### Frontend
1. Navigate to the `eduiafront` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   yarn dev
   ```

Exact commands may vary depending on repository configuration; Docker remains the reference setup.

---

## Target Users
EducAI is aimed at:
- Teachers who want to quickly generate customized mathematics exercises
- Educators who need automatic correction of student copies
- Users who want analytics and recommendations to adapt teaching strategies

---

## Screenshots

AI-powered chat interface allowing teachers to generate math exercises in French, aligned with the Cycle 2 curriculum.
<img width="940" height="496" alt="image" src="https://github.com/user-attachments/assets/d48abb4f-974c-4c31-8f8b-438e248b8701" />

Example of an AI-generated math exercise with structured questions and automatically provided correct answers.
<img width="940" height="464" alt="image4" src="https://github.com/user-attachments/assets/c90e3cbb-aa6c-4c6f-b6b2-47e5b0feaae8" />

Teacher dashboard giving access to exam correction, performance analytics, stored results, and curriculum upload.
<img width="940" height="508" alt="image6" src="https://github.com/user-attachments/assets/02ae1342-5874-4d85-9c9e-7b15af338cdd" />

Exam correction interface where teachers upload student exam PDFs for automatic analysis and grading.
<img width="940" height="419" alt="image7" src="https://github.com/user-attachments/assets/155248ac-f444-4f76-98ca-8ed4c2234a8d" />

Automatically corrected exam showing validated scores, per-question results, and feedback generated by the system.
<img width="940" height="508" alt="image9" src="https://github.com/user-attachments/assets/e727c28b-0899-44d7-a69f-b6f6e133d42e" />

Student performance analytics with personalized recommendations to highlight strengths and learning gaps.
<img width="940" height="504" alt="image10" src="https://github.com/user-attachments/assets/e29e8ec7-23e5-41f5-9e6d-c8c777c0c1ff" />

List of corrected exams with saved results, enabling tracking of student performance over time.
<img width="940" height="506" alt="image12" src="https://github.com/user-attachments/assets/56e0a387-cdb0-498f-b016-18eeca659de3" />

---

## Authors
- **Sulaiman FAYYAZ**
- **Kamul ALI NASSOMA WATTARA**

Final-year **Master of Engineering** project (2025).
