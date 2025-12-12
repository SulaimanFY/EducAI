from sqlalchemy import text
from fastapi import HTTPException

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