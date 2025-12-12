import json
import sqlite3
from sqlalchemy.orm import Session
from models import Exercice, QCM, QCMReponse, Eleve, Soumission, Resultat
import fitz  
import os
from datetime import datetime
from sqlalchemy import text
from sqlalchemy import inspect
def insert_submission_data(data, db=None):
    """
    Insert student submission data into the database using either SQLAlchemy or direct SQLite connection.
    
    Args:
        data (dict): Structured data containing student information and responses
        db (Session, optional): SQLAlchemy database session. If None, uses SQLite connection.
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Validate required fields
        if not all(key in data for key in ["id_eleve", "id_exercice", "nom_eleve", "date_soumission", "reponses"]):
            print("Error: Missing required fields in submission data")
            return False
            
        if not isinstance(data["reponses"], list) or len(data["reponses"]) == 0:
            print("Error: No responses found in submission data")
            return False
        
        if db:
            # Use SQLAlchemy session
            # Insert or get student
            student = db.query(Eleve).filter(Eleve.id == data["id_eleve"]).first()
            if not student:
                student = Eleve(id=data["id_eleve"], nom=data["nom_eleve"])
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
                # Validate response data
                if not all(key in reponse for key in ["question", "reponse_choisie"]):
                    print(f"Error: Invalid response format: {reponse}")
                    continue
                
                # Check if submission already exists
                existing_submission = db.query(Soumission).filter(
                    Soumission.eleve_id == data["id_eleve"],
                    Soumission.exercice_id == data["id_exercice"],
                    Soumission.question == reponse["question"]
                ).first()
                
                if existing_submission:
                    # Update existing submission with new answer
                    existing_submission.answer = reponse["reponse_choisie"]
                    existing_submission.date_soumission = date_soumission
                else:
                    # Create new submission
                    new_submission = Soumission(
                        eleve_id=data["id_eleve"],
                        exercice_id=data["id_exercice"],
                        date_soumission=date_soumission,
                        question=reponse["question"],
                        answer=reponse["reponse_choisie"]
                    )
                    db.add(new_submission)
            
            db.commit()
            return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error while inserting submission data: {e}")
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
        print(f"Error saving PDF file: {e}")
        return ""


def extract_text_from_pdf_from_bytes(pdf_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        
        # Save the PDF file with a proper filename
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        file_path = save_pdf_to_submission_folder(
            pdf_bytes, 
            f"submission_{timestamp}.pdf", 
            submission_folder="submissions"
        )
        
        if file_path:
            print(f"PDF saved to: {file_path}")
        
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
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
    # If provided as string, parse JSON
    if isinstance(qcm_data, str):
        try:
            qcm_data = json.loads(qcm_data)
        except json.JSONDecodeError:
            print("Error parsing QCM data JSON")
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
            print(f"Error inserting QCM data: {e}")
            return None
    else:
        print("Error: No database session provided")
        return None

def save_student_result(db, exo_id, eleve_id, score):
    """
    Save or update the result for a student's submission.
    
    Args:
        db: Database session
        exo_id: Exercise ID
        eleve_id: Student ID
        score: Score to save
        
    Returns:
        ID of the created or updated result
        
    Raises:
        ValueError: If exercise or student doesn't exist
    """
    # Check if submission exists
    exercice = db.query(Exercice).filter(Exercice.id == exo_id).first()
    eleve = db.query(Eleve).filter(Eleve.id == eleve_id).first()
    
    if not exercice:
        raise ValueError("Exercice not found")
    if not eleve:
        raise ValueError("Eleve not found")
    
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
    """
    Retrieve metrics data for dashboard:
    - Average score across all results
    - Total exams corrected
    - Score change compared to previous month
    """
    from datetime import datetime, timedelta
    from sqlalchemy import text, func
    
    # Define time periods for comparisons
    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)
    previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    
    # Base query to get all results if no professor_id specified
    if professeur_id:
        # For a specific professor, only count exams they created
        base_query = text("""
            SELECT r.id, r.score, ex.id, ex.professeur_id
            FROM resultats r
            JOIN exercices ex ON r.exercice_id = ex.id
            WHERE ex.professeur_id = :prof_id
        """)
        params = {"prof_id": professeur_id}
    else:
        # For all results
        base_query = text("""
            SELECT r.id, r.score
            FROM resultats r
        """)
        params = {}
    
    # Get current average
    results = db.execute(base_query, params).fetchall()
    total_exams = len(results)
    
    if total_exams > 0:
        avg_score = sum(r.score for r in results) / total_exams
    else:
        avg_score = 0
    
    # Get previous month data
    if professeur_id:
        prev_month_query = text("""
            SELECT AVG(r.score) as avg_score, COUNT(r.id) as count
            FROM resultats r
            JOIN exercices ex ON r.exercice_id = ex.id
            JOIN soumissions s ON r.exercice_id = s.exercice_id
            WHERE ex.professeur_id = :prof_id
            AND s.date_soumission < :cutoff_date
        """)
        prev_params = {"prof_id": professeur_id, "cutoff_date": current_month_start}
    else:
        prev_month_query = text("""
            SELECT AVG(r.score) as avg_score, COUNT(r.id) as count
            FROM resultats r
            JOIN soumissions s ON r.exercice_id = s.exercice_id
            WHERE s.date_soumission < :cutoff_date
        """)
        prev_params = {"cutoff_date": current_month_start}
    
    prev_result = db.execute(prev_month_query, prev_params).fetchone()
    
    if prev_result and prev_result.avg_score:
        score_change = round(avg_score - prev_result.avg_score, 1)
        exams_trend = total_exams - prev_result.count
    else:
        score_change = 0
        exams_trend = total_exams
    
    return {
        "averageScore": round(avg_score, 1),
        "examsCorrected": total_exams,
        "scoreChange": score_change,
        "examsTrend": exams_trend
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
 

def get_student_data(db, eleve_id):
    """Récupère les données complètes sur un élève et ses performances"""
    query = text("""
    SELECT 
        e.id, 
        e.nom AS nom_eleve, 
        e.email,
        ex.id, 
        ex.titre AS titre_exercice, 
        ex.contenu,
        s.date_soumission,
        s.question AS question_soumise,
        s.answer AS reponse_soumise,
        r.score,
        qcm.question AS question_qcm
    FROM 
        Eleve e
    LEFT JOIN 
        Soumissions s ON e.id = s.eleve_id
    LEFT JOIN 
        Exercices ex ON s.exercice_id = ex.id
    LEFT JOIN 
        Resultats r ON s.id = r.id
    LEFT JOIN 
        QCMS qcm ON s.exercice_id = qcm.id
    WHERE 
        e.id = :eleve_id
    """)
    
    return db.execute(query, {"eleve_id": eleve_id}).fetchall()

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
            
    # Format the submission data for specific exercise
    performance_details = []
    exercice_titre = data[0].titre
    for submission in data:
        performance_details.append(f"- Submission on {submission.date_soumission}: Question: {submission.question}, Answer: {submission.answer}, Score: {submission.score or 'Not evaluated'}")
    
    performance_str = f"Exercise: {exercice_titre}\n" + "\n".join(performance_details)
    
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
        COUNT(DISTINCT s.id) as submission_count,
        AVG(r.score) as avg_score
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
            score_text = f"Average score: {row.avg_score:.1f}" if row.avg_score else "No scores recorded"
            performance_details.append(
                f"Exercise: {row.exercice_titre}\n- {row.submission_count} submissions, {score_text}"
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


def add_missing_columns(engine):
    """Add missing columns to existing tables without recreating the database"""
    try:
        # Get inspector to check existing columns
        inspector = inspect(engine)
        
        # Check if file_path column exists in programmes table
        existing_columns = [col['name'] for col in inspector.get_columns('programmes')]
        
        if 'file_path' not in existing_columns:
            # Add the missing column
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE programmes ADD COLUMN file_path VARCHAR"))
                print("Added file_path column to programmes table")
        
        # Check for other missing columns as needed
        
    except Exception as e:
        print(f"Error updating database schema: {e}")