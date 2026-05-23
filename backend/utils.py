import json
import logging
import os
import sqlite3
from datetime import datetime

import fitz
from sqlalchemy import text

from models import Eleve, Exercice, QCM, QCMReponse, Resultat, Soumission

logger = logging.getLogger(__name__)


def resolve_exercice_id(db, exo_id, professeur_id=None):
    """Return a valid exercise id, falling back to the latest exercise when PDF id is stale."""
    exercice = db.query(Exercice).filter(Exercice.id == exo_id).first()
    if exercice:
        return exo_id

    query = db.query(Exercice)
    if professeur_id:
        query = query.filter(Exercice.professeur_id == professeur_id)
    fallback = query.order_by(Exercice.id.desc()).first()
    if fallback:
        return fallback.id

    raise ValueError(
        "Aucun exercice disponible. Générez d'abord un QCM via le chat avant de corriger une copie."
    )


def reconcile_submissions_exercise(db, eleve_id, exercice_id):
    """Reassign orphan submissions to a valid exercise id after DB resets."""
    valid_exercice_ids = {row[0] for row in db.query(Exercice.id).all()}
    if not valid_exercice_ids:
        return

    submissions = db.query(Soumission).filter(Soumission.eleve_id == eleve_id).all()
    updated = False
    for submission in submissions:
        if submission.exercice_id not in valid_exercice_ids:
            submission.exercice_id = exercice_id
            updated = True

    if updated:
        db.commit()


def insert_submission_data(data, db=None):  # noqa: C901
    """Insert student submission data via the SQLAlchemy session.

    Args:
        data (dict): Structured data containing student information and responses.
        db (Session): SQLAlchemy session. Required.

    Returns:
        bool: True on success, False otherwise.
    """
    try:
        if not all(key in data for key in ["id_eleve", "id_exercice", "nom_eleve", "date_soumission", "reponses"]):
            logger.warning("Missing required fields in submission data")
            return False

        if not isinstance(data["reponses"], list) or len(data["reponses"]) == 0:
            logger.warning("No responses found in submission data")
            return False
        
        if db:
            # Use SQLAlchemy session
            eleve_id = int(data["id_eleve"])
            exercice_id = int(data["id_exercice"])

            # Insert or get student
            student = db.query(Eleve).filter(Eleve.id == eleve_id).first()
            if not student:
                student = Eleve(id=eleve_id, nom=data["nom_eleve"])
                db.add(student)
                db.flush()
            
            # Ensure date_soumission is a datetime object, not a string
            if isinstance(data["date_soumission"], str):
                try:
                    date_soumission = datetime.strptime(data["date_soumission"], '%Y-%m-%d')
                except ValueError:
                    date_soumission = datetime.now()
            else:
                date_soumission = datetime.now()
            
            # Insert responses
            for reponse in data["reponses"]:
                if not all(key in reponse for key in ["question", "reponse_choisie"]):
                    logger.warning("Invalid response format: %s", reponse)
                    continue
                
                # Check if submission already exists
                existing_submission = db.query(Soumission).filter(
                    Soumission.eleve_id == eleve_id,
                    Soumission.exercice_id == exercice_id,
                    Soumission.question == reponse["question"]
                ).first()
                
                if existing_submission:
                    # Update existing submission with new answer
                    existing_submission.answer = reponse["reponse_choisie"]
                    existing_submission.date_soumission = date_soumission
                else:
                    # Create new submission
                    new_submission = Soumission(
                        eleve_id=eleve_id,
                        exercice_id=exercice_id,
                        date_soumission=date_soumission,
                        question=reponse["question"],
                        answer=reponse["reponse_choisie"]
                    )
                    db.add(new_submission)
            
            db.commit()
            return True
        
    except sqlite3.Error as e:
        logger.error("Database error in insert_submission_data: %s", e)
        return False
    except Exception as e:
        logger.exception("Unexpected error in insert_submission_data: %s", e)
        return False


def save_pdf_to_submission_folder(pdf_bytes: bytes, filename: str, submission_folder: str = "submissions") -> str:
    """
    Save a PDF file to the submission folder with a valid filename
    
    Args:
        pdf_bytes (bytes): The PDF content as bytes
        filename (str): The desired filename
        submission_folder (str): The folder to save the PDF to
        
    Returns:
        str: The path to the saved PDF file
    """
    try:
        # Create submissions folder if it doesn't exist
        os.makedirs(submission_folder, exist_ok=True)
        
        # Sanitize the filename to remove invalid characters (like colons)
        sanitized_filename = filename.replace(":", "-").replace(" ", "_")
        
        # Ensure the filename has .pdf extension
        if not sanitized_filename.lower().endswith('.pdf'):
            sanitized_filename += '.pdf'
            
        file_path = os.path.join(submission_folder, sanitized_filename)
        
        # Write the PDF bytes to the file
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)
            
        return file_path
    except Exception as e:
        logger.exception("Error saving PDF file: %s", e)
        return ""


def extract_text_from_pdf_from_bytes(pdf_bytes: bytes) -> str:
    """Extract text from a PDF and persist the original file for traceability."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        extracted = "\n".join(page.get_text() for page in doc)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        file_path = save_pdf_to_submission_folder(
            pdf_bytes,
            f"submission_{timestamp}.pdf",
            submission_folder="submissions",
        )
        if file_path:
            logger.info("PDF saved to %s", file_path)

        return extracted
    except Exception as e:
        logger.exception("Error extracting text from PDF: %s", e)
        return ""

def get_correct_answers_count(db, id_eleve, id_exercice):
    """
    Count correct answers for a student's submission on a specific exercise
    with a direct letter mapping
    """
    if not id_eleve or not id_exercice:
        return 0
        
    query = text("""
        SELECT COUNT(*)
        FROM soumissions s
        JOIN qcms q ON LOWER(s.question) = LOWER(q.exercice_qcm_id) AND q.exercice_id = s.exercice_id
        JOIN qcm_reponses r ON r.qcm_id = q.id AND LOWER(r.lettre) = LOWER(s.answer)
        WHERE s.eleve_id = :id_eleve 
          AND s.exercice_id = :id_exercice 
          AND r.est_correct = 1
    """)
    
    result = db.execute(query, {"id_eleve": id_eleve, "id_exercice": id_exercice}).scalar()
    return result if result else 0

def get_submission_data(db, student_id, exercise_id):
    """
    Get the details of a student's submission for a specific exercise
    """
    if not student_id or not exercise_id:
        return []
        
    query = text("""
        SELECT 
            s.id,
            s.question,
            s.answer,
            s.date_soumission
        FROM 
            Soumissions s
        WHERE 
            s.eleve_id = :student_id 
            AND s.exercice_id = :exercise_id
        ORDER BY 
            s.date_soumission DESC
    """)
    
    results = db.execute(query, {"student_id": student_id, "exercise_id": exercise_id}).fetchall()
    
    # Convert to list of dictionaries for JSON serialization
    submission_data = []
    for row in results:
        submission_data.append({
            "id": row.id,
            "question": row.question,
            "answer": row.answer,
            "date_soumission": row.date_soumission
        })
    
    return submission_data

def get_correct_answers(db, exercise_id):
    """
    Get the correct answers for a specific exercise
    """
    if not exercise_id:
        return []
        
    query = text("""
        SELECT 
            q.exercice_qcm_id,
            q.question,
            r.texte AS correct_answer,
            r.lettre
        FROM 
            qcms q
        JOIN 
            qcm_reponses r ON q.id = r.qcm_id
        WHERE 
            q.exercice_id = :exercise_id
            AND r.est_correct = 1
    """)
    
    results = db.execute(query, {"exercise_id": exercise_id}).fetchall()
    
    # Convert to list of dictionaries for JSON serialization
    correct_answers = []
    for row in results:
        correct_answers.append({
            "id_qcm": row.exercice_qcm_id,
            "question": row.question,
            "correct_answer": row.correct_answer,
            "lettre": row.lettre
        })
    
    return correct_answers


def insert_qcm_data(qcm_data, professeur_id, db=None):
    """
    Insert QCM data into the database using either SQLAlchemy or direct SQLite connection.
    
    Args:
        qcm_data (dict): JSON response from the QCM generation model
        professeur_id: ID of the professor creating the QCM
        db (Session, optional): SQLAlchemy database session. If None, uses SQLite connection.
        
    Returns:
        Exercice: The created exercise object or None if an error occurred
    """
    if isinstance(qcm_data, str):
        try:
            qcm_data = json.loads(qcm_data)
        except json.JSONDecodeError as e:
            logger.error("Error parsing QCM data JSON: %s", e)
            return None
    
    if db:
        try:
            # Use SQLAlchemy session
            # Create new exercise
            new_exercise = Exercice(
                titre=qcm_data["titre"],
                contenu=qcm_data["contenu"],
                professeur_id=professeur_id  # Default professor ID
            )
            db.add(new_exercise)
            db.flush()  # Get the ID without committing
            
            # Create QCM questions
            for q in qcm_data["qcm"]:
                new_qcm = QCM(
                    question=q["question"],
                    exercice_id=new_exercise.id,
                    
                    exercice_qcm_id=q["id_qcm"]
                )
                db.add(new_qcm)
                db.flush()
                
                # Create answers for each question
                for rep in q["reponses"]:
                    new_reponse = QCMReponse(
                        texte=rep["texte"],
                        est_correct=rep["est_correct"],
                        lettre=rep["lettre"],
                        qcm_id=new_qcm.id
                    )
                    db.add(new_reponse)
            
            db.commit()
            return new_exercise
        except Exception as e:
            db.rollback()
            logger.exception("Error inserting QCM data: %s", e)
            return None
    else:
        logger.error("insert_qcm_data called without a database session")
        return None

def save_student_result(db, exo_id, eleve_id, score, professeur_id=None):
    """
    Save or update the result for a student's submission.
    
    Args:
        db: Database session
        exo_id: Exercise ID
        eleve_id: Student ID
        score: Score to save
        professeur_id: Optional professor id used to resolve stale exercise ids
        
    Returns:
        ID of the created or updated result
        
    Raises:
        ValueError: If exercise or student doesn't exist
    """
    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    if not eleve:
        raise ValueError("Eleve not found")

    exo_id = resolve_exercice_id(db, exo_id, professeur_id)
    reconcile_submissions_exercise(db, eleve_id, exo_id)

    exercice = db.query(Exercice).filter(Exercice.id == exo_id).first()
    if not exercice:
        raise ValueError("Exercice not found")
    
    # Check if a result already exists for this student-exercise pair
    existing_result = db.query(Resultat).filter(
        Resultat.exercice_id == exo_id,
        Resultat.eleve_id == eleve_id
    ).first()
    
    if existing_result:
        # Update existing result
        existing_result.score = score
        db.commit()
        db.refresh(existing_result)
        return existing_result.id
    else:
        # Create new result
        new_result = Resultat(
            score=score,
            exercice_id=exo_id,
            eleve_id=eleve_id
        )
        
        db.add(new_result)
        db.commit()
        db.refresh(new_result)
        return new_result.id

def get_metrics(db, professeur_id=None):
    """Retrieve dashboard metrics for the current professor.

    Returns:
        dict with::

            {
                "averageScore": float,        # current month-to-date average (%)
                "examsCorrected": int,        # total number of corrected exams
                "scoreChange": float,         # delta vs previous month (% points)
                "examsTrend": int,            # delta in count vs previous month
                "hasPreviousPeriod": bool,    # True only if real data exists for last month
            }

    ``scoreChange`` and ``examsTrend`` are only meaningful when
    ``hasPreviousPeriod`` is True. The frontend MUST hide these counters
    otherwise instead of showing a misleading "+0%".
    """
    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)

    overall_query_prof = """
        SELECT
            r.id,
            (r.score * 100.0) / NULLIF((
                SELECT COUNT(*)
                FROM soumissions s
                WHERE s.exercice_id = r.exercice_id
                  AND s.eleve_id = r.eleve_id
            ), 0) AS score_percent
        FROM resultats r
        JOIN exercices ex ON r.exercice_id = ex.id
        WHERE ex.professeur_id = :prof_id
    """
    overall_query_all = """
        SELECT
            r.id,
            (r.score * 100.0) / NULLIF((
                SELECT COUNT(*)
                FROM soumissions s
                WHERE s.exercice_id = r.exercice_id
                  AND s.eleve_id = r.eleve_id
            ), 0) AS score_percent
        FROM resultats r
    """
    if professeur_id:
        overall_results = db.execute(
            text(overall_query_prof), {"prof_id": professeur_id}
        ).fetchall()
    else:
        overall_results = db.execute(text(overall_query_all)).fetchall()

    total_exams = len(overall_results)
    valid_scores = [r.score_percent for r in overall_results if r.score_percent is not None]
    avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0

    period_query = """
        SELECT
            (r.score * 100.0) / NULLIF((
                SELECT COUNT(*) FROM soumissions s2
                WHERE s2.exercice_id = r.exercice_id
                  AND s2.eleve_id = r.eleve_id
            ), 0) AS score_percent,
            MAX(s.date_soumission) AS last_submission
        FROM resultats r
        JOIN exercices ex ON r.exercice_id = ex.id
        JOIN soumissions s ON s.exercice_id = r.exercice_id AND s.eleve_id = r.eleve_id
        {prof_filter}
        GROUP BY r.id
    """
    prof_filter = "WHERE ex.professeur_id = :prof_id" if professeur_id else ""
    period_params = {"prof_id": professeur_id} if professeur_id else {}
    period_rows = db.execute(
        text(period_query.format(prof_filter=prof_filter)), period_params
    ).fetchall()

    current_scores = []
    previous_scores = []
    for row in period_rows:
        last_dt = row.last_submission
        if isinstance(last_dt, str):
            try:
                last_dt = datetime.fromisoformat(last_dt.replace(" ", "T"))
            except ValueError:
                last_dt = None
        if last_dt is None or row.score_percent is None:
            continue
        if last_dt >= current_month_start:
            current_scores.append(row.score_percent)
        else:
            previous_scores.append(row.score_percent)

    has_previous_period = bool(previous_scores) and bool(current_scores)
    if has_previous_period:
        current_avg = sum(current_scores) / len(current_scores)
        previous_avg = sum(previous_scores) / len(previous_scores)
        score_change = round(current_avg - previous_avg, 1)
        exams_trend = len(current_scores) - len(previous_scores)
    else:
        score_change = 0
        exams_trend = 0

    return {
        "averageScore": round(avg_score, 1),
        "examsCorrected": total_exams,
        "scoreChange": score_change,
        "examsTrend": exams_trend,
        "hasPreviousPeriod": has_previous_period,
    }

def get_student_list(db, professeur_id=None):
    """Get list of students, optionally filtered by professor relation"""
    from sqlalchemy import text
    
    if professeur_id:
        # Get students who have submitted to exercises by this professor
        query = text("""
            SELECT DISTINCT e.id, e.nom, e.email
            FROM eleves e
            JOIN soumissions s ON e.id = s.eleve_id
            JOIN exercices ex ON s.exercice_id = ex.id
            WHERE ex.professeur_id = :prof_id
            ORDER BY e.nom, e.email
        """)
        params = {"prof_id": professeur_id}
    else:
        # Get all students
        query = text("""
            SELECT id, nom, email
            FROM eleves
            ORDER BY nom, email
        """)
        params = {}
    
    students = db.execute(query, params).fetchall()
    return [{"id": s.id, "nom": s.nom, "email": s.email} for s in students]

def get_exercises_list(db, professeur_id=None):
    """Get list of exercises, optionally filtered by professor"""
    from sqlalchemy import text
    
    if professeur_id:
        query = text("""
            SELECT id, titre, contenu
            FROM exercices
            WHERE professeur_id = :prof_id
            ORDER BY id DESC
        """)
        params = {"prof_id": professeur_id}
    else:
        query = text("""
            SELECT id, titre, contenu
            FROM exercices
            ORDER BY id DESC
        """)
        params = {}
    
    exercises = db.execute(query, params).fetchall()
    return [{"id": ex.id, "titre": ex.titre, "contenu": ex.contenu} for ex in exercises]
 

def get_exercise_submissions(db, eleve_id, exercice_id):
    """Récupère les soumissions d'un élève pour un exercice spécifique"""
    query = text("""
    SELECT 
        s.id,
        s.date_soumission,
        s.question,
        s.answer,
        r.score,
        ex.titre,
        ex.contenu
    FROM 
        Soumissions s
    LEFT JOIN 
        Resultats r ON r.eleve_id = s.eleve_id AND r.exercice_id = s.exercice_id
    LEFT JOIN 
        Exercices ex ON s.exercice_id = ex.id
    WHERE 
        s.eleve_id = :eleve_id AND s.exercice_id = :exercice_id
    """)
    
    return db.execute(query, {"eleve_id": eleve_id, "exercice_id": exercice_id}).fetchall()

def get_exercise_performance_data(db, eleve_id, exercice_id):
    """Returns student info and formatted performance data for a specific exercise"""
    data = get_exercise_submissions(db, eleve_id, exercice_id)
    if not data:
        return {}, ""
            
    total_questions = len(data)
    final_score = data[0].score if data[0].score is not None else 0
    score_percent = round((final_score / total_questions) * 100, 1) if total_questions else 0
    exercice_titre = data[0].titre
    answers = [
        f"{submission.question}: réponse élève {submission.answer}"
        for submission in data
    ]

    performance_str = (
        f"Exercice: {exercice_titre}\n"
        f"Score final: {final_score}/{total_questions} bonnes réponses ({score_percent}%).\n"
        f"Conclusion factuelle: l'élève n'a pas tout réussi si le score est inférieur à {total_questions}/{total_questions}.\n"
        "Réponses de l'élève:\n"
        + "\n".join(answers)
    )
    
    # Get student info
    student_query = text("SELECT nom, email FROM eleves WHERE id = :id")
    student = db.execute(student_query, {"id": eleve_id}).fetchone()
    
    if student:
        eleve_info = {"nom_eleve": student.nom, "email": student.email}
    else:
        eleve_info = {"nom_eleve": "Student", "email": f"#{eleve_id}"}
        
    return eleve_info, performance_str

def get_student_global_performance(db, eleve_id, professeur_id):
    """Returns student info and formatted performance data across all exercises"""
    student_query = text("""
    SELECT 
        e.id, 
        e.nom, 
        e.email,
        ex.id as exercice_id, 
        ex.titre as exercice_titre,
        COUNT(DISTINCT s.id) as total_questions,
        MAX(r.score) as correct_count
    FROM 
        eleves e
    JOIN 
        soumissions s ON e.id = s.eleve_id
    JOIN 
        exercices ex ON s.exercice_id = ex.id
    LEFT JOIN 
        resultats r ON r.eleve_id = s.eleve_id AND r.exercice_id = s.exercice_id
    WHERE 
        e.id = :eleve_id
        AND ex.professeur_id = :prof_id
    GROUP BY
        e.id, ex.id
    """)
    
    student_data = db.execute(student_query, {
        "eleve_id": eleve_id,
        "prof_id": professeur_id
    }).fetchall()
    
    if not student_data:
        return {}, ""
    
    # Extract student info
    eleve_info = {
        "nom_eleve": student_data[0].nom,
        "email": student_data[0].email
    }
    
    # Format performance data
    performance_details = []
    for row in student_data:
        if row.exercice_titre:
            correct_count = row.correct_count or 0
            total_questions = row.total_questions or 0
            score_percent = (
                round((correct_count / total_questions) * 100, 1)
                if total_questions
                else 0
            )
            performance_details.append(
                f"Exercice: {row.exercice_titre}\n"
                f"Score final: {correct_count}/{total_questions} bonnes réponses ({score_percent}%).\n"
                f"Conclusion factuelle: l'élève n'a pas tout réussi si le score est inférieur à {total_questions}/{total_questions}."
            )
    
    performance_str = "\n".join(performance_details) if performance_details else "No exercise submissions found."
    
    return eleve_info, performance_str 


def verify_exam_belongs_to_professor(db, exam_id, professor_id):
    """Verify an exam/exercise belongs to a specific professor"""
    verify_query = text("""
        SELECT COUNT(*) as count
        FROM exercices
        WHERE id = :exam_id AND professeur_id = :prof_id
    """)
    
    verify_result = db.execute(verify_query, {
        "exam_id": exam_id,
        "prof_id": professor_id
    }).fetchone()
    
    return verify_result.count > 0

def verify_student_access(db, student_id, professor_id):
    """Verify a professor has access to a student's data"""
    verify_query = text("""
        SELECT COUNT(*) as count
        FROM soumissions s
        JOIN exercices ex ON s.exercice_id = ex.id
        WHERE s.eleve_id = :eleve_id 
        AND ex.professeur_id = :prof_id
    """)
    
    result = db.execute(verify_query, {
        "eleve_id": student_id,
        "prof_id": professor_id
    }).fetchone()
    
    return result.count > 0

def get_exam_results_for_professor(db, exam_id, professor_id):
    """Get all student results for a specific exam/exercise"""
    query = text("""
        SELECT e.nom as student, 
               CAST((r.score * 100.0) / (SELECT COUNT(*) FROM soumissions WHERE exercice_id = :exam_id AND eleve_id = e.id) AS INTEGER) as score,
               MAX(strftime('%Y-%m-%d', s.date_soumission)) as submission_date,
               (SELECT COUNT(*) FROM soumissions WHERE exercice_id = :exam_id AND eleve_id = e.id) as total_questions,
               CASE 
                   WHEN r.score >= (SELECT COUNT(*) FROM soumissions WHERE exercice_id = :exam_id AND eleve_id = e.id) * 0.7 THEN 'PASSED'
                   ELSE 'NEEDS IMPROVEMENT'
               END as status
        FROM resultats r
        JOIN eleves e ON r.eleve_id = e.id
        JOIN exercices ex ON r.exercice_id = ex.id
        JOIN professeurs p ON ex.professeur_id = p.id
        JOIN soumissions s ON r.eleve_id = s.eleve_id AND r.exercice_id = s.exercice_id
        WHERE p.id = :prof_id
        AND r.exercice_id = :exam_id
        GROUP BY e.id
        ORDER BY MAX(s.date_soumission) DESC
    """)
    
    result = db.execute(query, {"exam_id": exam_id, "prof_id": professor_id}).fetchall()
    
    # Convert to list of dictionaries
    return [
        {
            "student": row.student,
            "score": row.score,
            "submission_date": row.submission_date,
            "status": row.status
        } 
        for row in result
    ]

def get_pending_submissions(db, exam_id):
    """Get submissions that haven't been graded yet"""
    submissions_query = text("""
        SELECT e.nom as student,
               0 as score,
               strftime('%Y-%m-%d', s.date_soumission) as submission_date,
               'PENDING' as status
        FROM soumissions s
        JOIN eleves e ON s.eleve_id = e.id
        LEFT JOIN resultats r ON r.eleve_id = s.eleve_id AND r.exercice_id = s.exercice_id
        WHERE s.exercice_id = :exam_id AND r.id IS NULL
        GROUP BY s.eleve_id
        ORDER BY s.date_soumission DESC
    """)
    
    result = db.execute(submissions_query, {"exam_id": exam_id}).fetchall()
    
    return [
        {
            "student": row.student,
            "score": row.score,
            "submission_date": row.submission_date,
            "status": row.status
        } 
        for row in result
    ]

def get_exams_for_professor(db, professor_id):
    """Get list of exercises formatted as exams for the dashboard"""
    query = text("""
        SELECT e.id, e.titre as name
        FROM exercices e
        WHERE e.professeur_id = :prof_id
        ORDER BY e.titre DESC
    """)
    
    result = db.execute(query, {"prof_id": professor_id}).fetchall()
    
    return [{"id": row.id, "name": row.name} for row in result] 

