# Conceptual Data Model

Table and column names in the code are in French (for example `eleves` for pupils and `soumissions` for submissions). This page gives each entity in English with its table name.

## Entities and attributes

1. **Teacher** (`professeurs`)
   - Teacher ID (PK)
   - Name
   - Email
   - Password (hashed)

2. **Curriculum** (`programmes`)
   - Curriculum ID (PK)
   - Name
   - Description
   - Teacher ID (FK)
   - File path

3. **Exercise** (`exercices`)
   - Exercise ID (PK)
   - Title
   - Content
   - Teacher ID (FK)
   - Curriculum ID (FK)

4. **Multiple-choice question** (`qcms`)
   - Question ID (PK)
   - Question number within the exercise (Q1, Q2, ...)
   - Question text
   - Exercise ID (FK)

5. **Answer option** (`qcm_reponses`)
   - Option ID (PK)
   - Text
   - Is correct (boolean)
   - Letter (A to D)
   - Question ID (FK)

6. **Pupil** (`eleves`)
   - Pupil ID (PK)
   - Name
   - Email
   - Password

7. **Submission** (`soumissions`)
   - Submission ID (PK)
   - Submission date
   - Question
   - Answer
   - Pupil ID (FK)
   - Exercise ID (FK)

8. **Result** (`resultats`)
   - Result ID (PK)
   - Score (number of correct answers)
   - Pupil ID (FK)
   - Exercise ID (FK)

## Relationships
- A **teacher** creates many **exercises** and **curricula**.
- A **curriculum** belongs to one **teacher** and contains many **exercises**.
- An **exercise** belongs to one **curriculum** and one **teacher**.
- An **exercise** contains many **multiple-choice questions**.
- A **question** has several **answer options**, one of which is correct.
- A **pupil** makes many **submissions** for different **exercises**.
- A **pupil** gets many **results** for different **exercises**.

This model supports multiple-choice maths exercises and tracks each pupil's results over time.
