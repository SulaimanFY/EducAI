import os
from datetime import datetime, timedelta
from typing import List, Optional

import jwt
import re
import json
import sqlite3  # used for test submission data

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    Security,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import Base, Exercice, Professeur, Programme, Soumission
from database import SessionLocal, engine
from llm_agent import (
    invoke_generate_qcm_agent,
    format_qcm_data,
    invoke_analyze_student_copy_agent,
    invoke_llm_recommendation_agent,
)
from utils import (
    insert_qcm_data,
    extract_text_from_pdf_from_bytes,
    insert_submission_data,
    get_correct_answers_count,
    get_submission_data,
    get_correct_answers,
    save_student_result,
    get_metrics,
    get_student_list,
    get_exercises_list,
    get_exercise_performance_data,
    get_student_global_performance,
    save_pdf_to_submission_folder,
    verify_exam_belongs_to_professor,
    verify_student_access,
    get_exam_results_for_professor,
    get_pending_submissions,
    get_exams_for_professor,
    resolve_exercice_id,
    reconcile_submissions_exercise,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# INITIAL SETUP
# ======================================================
Base.metadata.create_all(bind=engine)
# add_missing_columns(engine)

# ----------------------------
# CONFIGURATION JWT
# ----------------------------
SECRET_KEY = os.environ.get("EDUCAI_JWT_SECRET", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("EDUCAI_TOKEN_EXPIRE_MINUTES", "60"))

# ----------------------------
# GESTION DES MOTS DE PASSE
# ----------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ----------------------------
# CREATION DU TOKEN
# ----------------------------
def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ----------------------------
# DEPENDANCE BD
# ----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------
# RECUPERATION PROF PAR EMAIL
# ----------------------------
def get_professeur_by_email(db: Session, email: str) -> Optional[Professeur]:
    return db.query(Professeur).filter(Professeur.email == email).first()


# ======================================================
# MODELS (PYDANTIC)
# ======================================================
class ProfesseurCreate(BaseModel):
    nom: str
    email: str
    mot_de_passe: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ExerciceCreate(BaseModel):
    titre: str
    contenu: str
    professeur_id: int


class ResultatCreate(BaseModel):
    score: int
    date_soumission: str  # Format YYYY-MM-DD
    eleve_nom: str
    exercice_id: int


# -------------------------------------------------------
# CLASSE CUSTOM POUR SAISIR L'EMAIL COMME 'username'
# -------------------------------------------------------
class OAuth2PasswordRequestFormEmail:
    def __init__(
        self,
        email: str = Form(...),
        password: str = Form(...),
        scope: str = Form(""),
        client_id: str = Form(None),
        client_secret: str = Form(None),
    ):
        self.username = email
        self.password = password
        self.scope = scope
        self.client_id = client_id
        self.client_secret = client_secret


# ------------------------------------------------------
# CHAMP DE SECURITE : HTTPBearer
# ------------------------------------------------------
bearer_scheme = HTTPBearer()


# ======= DÉPENDANCE POUR PARSER JSON OU FORMDATA =======
async def parse_professeur(request: Request) -> ProfesseurCreate:
    ct = request.headers.get("Content-Type", "")
    if "application/json" in ct:
        data = await request.json()
    else:
        data = dict(await request.form())
    return ProfesseurCreate(**data)


async def parse_exercice(request: Request) -> ExerciceCreate:
    ct = request.headers.get("Content-Type", "")
    if "application/json" in ct:
        data = await request.json()
    else:
        data = dict(await request.form())
    if "professeur_id" in data:
        data["professeur_id"] = int(data["professeur_id"])
    return ExerciceCreate(**data)


async def parse_resultat(request: Request) -> ResultatCreate:
    ct = request.headers.get("Content-Type", "")
    if "application/json" in ct:
        data = await request.json()
    else:
        data = dict(await request.form())
    if "score" in data:
        data["score"] = int(data["score"])
    if "exercice_id" in data:
        data["exercice_id"] = int(data["exercice_id"])
    return ResultatCreate(**data)


class ChatInput(BaseModel):
    message: str


async def parse_chatinput(request: Request) -> ChatInput:
    ct = request.headers.get("Content-Type", "")
    if "application/json" in ct:
        data = await request.json()
    else:
        data = dict(await request.form())
    return ChatInput(**data)


# ======================================================
# AUTHENTIFICATION
# ======================================================
@app.post("/register/")
async def register(
    professeur: ProfesseurCreate = Depends(parse_professeur),
    db: Session = Depends(get_db),
):
    """
    Inscription d'un nouveau Professeur dans la base.
    """
    existing = get_professeur_by_email(db, professeur.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    hashed_password = get_password_hash(professeur.mot_de_passe)
    new_prof = Professeur(
        nom=professeur.nom,
        email=professeur.email,
        mot_de_passe=hashed_password,
    )
    db.add(new_prof)
    db.commit()
    db.refresh(new_prof)
    return {"message": "Compte créé avec succès", "id": new_prof.id}


@app.post("/login/", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestFormEmail = Depends(), db: Session = Depends(get_db)
):
    prof = get_professeur_by_email(db, form_data.username)
    if not prof or not verify_password(form_data.password, prof.mot_de_passe):
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    access_token = create_access_token(
        data={"sub": prof.email, "id": prof.id, "role": "professeur"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


def get_current_professeur(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=401, detail="Token invalide (sub manquant)."
            )
        prof = get_professeur_by_email(db, email)
        if not prof:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable.")
        return prof
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré.")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token invalide.")


# ======================================================
# CRUD PROFESSEUR, EXERCICE, RESULTAT, etc.
# ======================================================
@app.get("/me/")
def read_users_me(current_user: Professeur = Depends(get_current_professeur)):
    return {
        "id": current_user.id,
        "nom": current_user.nom,
        "email": current_user.email,
        "role": "professeur",
    }


# ---------------- Submit Copy ----------------


@app.post("/correct-exam/")
async def submit_copy(
    pdf: UploadFile = File(...),
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """Analyse une copie élève (PDF) et renvoie une correction préliminaire.

    Réponse :
    - ``correct_count`` : nombre de bonnes réponses détectées automatiquement.
    - ``total_questions`` : nombre de questions de la soumission.
    - ``percentage`` : pourcentage de réussite estimé (0–100).
    - ``submission_data`` : réponses de l'élève question par question.
    - ``correct_answers`` : bonne réponse attendue pour chaque question.
    """
    pdf_bytes = await pdf.read()
    text = extract_text_from_pdf_from_bytes(pdf_bytes)
    structured_data = invoke_analyze_student_copy_agent(text)
    try:
        id_eleve = int(structured_data.get("id_eleve"))
        id_exercice = int(structured_data.get("id_exercice"))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Le PDF ne contient pas un id_eleve/id_exercice valide.",
        )

    original_exercice_id = id_exercice
    try:
        id_exercice = resolve_exercice_id(db, id_exercice, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    reconcile_submissions_exercise(db, id_eleve, id_exercice)

    structured_data["id_eleve"] = id_eleve
    structured_data["id_exercice"] = id_exercice
    has_inserted = insert_submission_data(structured_data, db)
    if not has_inserted:
        raise HTTPException(
            status_code=500,
            detail="L'insertion de la soumission a échoué. Vérifie le format du PDF.",
        )

    correct_count = get_correct_answers_count(
        db, id_eleve=id_eleve, id_exercice=id_exercice
    )
    submission_data = get_submission_data(db, id_eleve, id_exercice)
    correct_answers = get_correct_answers(db, id_exercice)

    total_questions = len(submission_data)
    percentage = (
        round((correct_count / total_questions) * 100, 1) if total_questions else 0
    )

    response = {
        "message": "Submission processed successfully",
        "data": structured_data,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "percentage": percentage,
        "submission_data": submission_data,
        "correct_answers": correct_answers,
    }
    if original_exercice_id != id_exercice:
        response["warning"] = (
            f"L'exercice {original_exercice_id} du PDF n'existe plus. "
            f"La correction a été associée à l'exercice {id_exercice}."
        )
    return response


# -------------------- Chat Endpoint --------------------
@app.post("/chat/")
async def chatbot(
    chat: ChatInput = Depends(parse_chatinput),
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    user_message = chat.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide.")

    qcm_payload = invoke_generate_qcm_agent(user_message, current_user.id, db)
    new_exercise = insert_qcm_data(qcm_payload, current_user.id, db)
    if not new_exercise:
        raise HTTPException(
            status_code=500,
            detail="La génération du QCM a échoué. Réessaie avec une consigne plus précise.",
        )
    return {"response": format_qcm_data(qcm_payload, new_exercise)}


# ----------------------------
# RECOMMENDATION
# ----------------------------


@app.get("/recommendations/student/{eleve_id}")
async def get_student_recommendations(
    eleve_id: int,
    exercice_id: Optional[int] = None,
    current_user: Professeur = Depends(get_current_professeur),
    db=Depends(get_db),
):
    """Génère des recommandations pour un élève, soit global soit pour un exercice spécifique"""

    # Verify student access using utility function
    if not verify_student_access(db, eleve_id, current_user.id):
        raise HTTPException(
            status_code=403, detail="You don't have access to this student's data"
        )

    # Get student and performance data using functions now in utils.py
    if exercice_id:
        # Verify the exercise belongs to this professor
        if not verify_exam_belongs_to_professor(db, exercice_id, current_user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this exercise"
            )

        student_info, performance_str = get_exercise_performance_data(
            db, eleve_id, exercice_id
        )
        if not performance_str:
            raise HTTPException(
                status_code=404, detail="No submissions found for this exercise"
            )
    else:
        student_info, performance_str = get_student_global_performance(
            db, eleve_id, current_user.id
        )
        if not performance_str:
            raise HTTPException(
                status_code=404, detail="No data found for this student"
            )

    # Generate recommendations using the new function in llm_agent.py
    result = invoke_llm_recommendation_agent(
        student_info["nom_eleve"], student_info["email"], performance_str
    )

    return result


@app.post("/save-result/")
async def save_submission_result(
    exo_id: int = Form(...),
    eleve_id: int = Form(...),
    score: int = Form(...),
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """Enregistre le résultat final corrigé par le professeur.

    ``score`` est le **nombre de bonnes réponses** validées par le professeur
    (entier compris entre 0 et le nombre total de questions).
    """
    if score < 0:
        raise HTTPException(
            status_code=400, detail="Le score ne peut pas être négatif."
        )
    try:
        result_id = save_student_result(
            db, exo_id, eleve_id, score, professeur_id=current_user.id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    total_questions = (
        db.query(Soumission)
        .filter(
            Soumission.exercice_id == exo_id,
            Soumission.eleve_id == eleve_id,
        )
        .count()
    )
    percentage = (
        round((score / total_questions) * 100, 1) if total_questions else 0
    )
    return {
        "message": "Result saved successfully",
        "result_id": result_id,
        "correct_count": score,
        "total_questions": total_questions,
        "percentage": percentage,
    }


@app.get("/metrics")
def get_dashboard_metrics(
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """
    Get dashboard metrics for the current professor or all data if admin
    """
    # Assuming we want professor-specific data
    metrics = get_metrics(db, professeur_id=current_user.id)
    return metrics


@app.get("/students")
def get_students(
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """
    Get list of students associated with exercises created by the current professor
    """
    students = get_student_list(db, professeur_id=current_user.id)
    return students


@app.get("/exercises")
def get_exercises(
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """
    Get list of exercises created by the current professor
    """
    exercises = get_exercises_list(db, professeur_id=current_user.id)
    return exercises


@app.get("/exams")
def get_exams(
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """Get list of exercises formatted as exams for the dashboard"""
    # Use the utility function instead of inline query
    exams = get_exams_for_professor(db, current_user.id)
    return exams


@app.get("/exam-results/{exam_id}")
def get_exam_results(
    exam_id: int,
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """Get all student results for a specific exam/exercise"""
    # First verify the exam belongs to this professor using utility function
    if not verify_exam_belongs_to_professor(db, exam_id, current_user.id):
        raise HTTPException(
            status_code=403, detail="You don't have access to this exam"
        )

    # Get exam results using utility function
    results = get_exam_results_for_professor(db, exam_id, current_user.id)

    # If no results, check for pending submissions
    if not results:
        results = get_pending_submissions(db, exam_id)

    return results


@app.post("/update_curriculum/")
async def update_curriculum(
    pdf: UploadFile = File(...),
    nom: str = Form(None),
    description: str = Form(None),
    current_user: Professeur = Depends(get_current_professeur),
    db: Session = Depends(get_db),
):
    """
    Upload a curriculum PDF file and save its details in the database
    """
    try:
        pdf_bytes = await pdf.read()

        # Create program folder if it doesn't exist
        program_folder = "program"
        os.makedirs(program_folder, exist_ok=True)

        # Generate filename from original filename or use a default
        filename = (
            pdf.filename or f"curriculum_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        )

        # Save the file using the existing utility function but specify program folder
        file_path = save_pdf_to_submission_folder(
            pdf_bytes, filename, submission_folder=program_folder
        )

        if not file_path:
            raise HTTPException(
                status_code=500, detail="Failed to save curriculum file"
            )

        # Fix: Determine the name value before using it in the query
        programme_name = nom if nom else "Default Curriculum"

        # Create or update Programme record
        # First check if there's an existing record to update
        existing_programme = (
            db.query(Programme)
            .filter(
                Programme.professeur_id == current_user.id,
                Programme.nom == programme_name,
            )
            .first()
        )

        if existing_programme:
            # Update existing record
            existing_programme.description = description or "Updated curriculum"
            existing_programme.file_path = file_path
            db.commit()
            programme_id = existing_programme.id
        else:
            # Create new record
            new_programme = Programme(
                nom=programme_name,
                description=description
                or f"Curriculum uploaded on {datetime.now().strftime('%Y-%m-%d')}",
                professeur_id=current_user.id,
                file_path=file_path,
            )
            db.add(new_programme)
            db.commit()
            db.refresh(new_programme)
            programme_id = new_programme.id

        return {
            "message": "Curriculum uploaded successfully",
            "programme_id": programme_id,
            "file_path": file_path,
        }

    except Exception as e:
        print(f"Error uploading curriculum: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to upload curriculum: {str(e)}"
        )
