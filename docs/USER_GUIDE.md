# EducAI user guide

EducAI helps primary teachers create maths exercises and mark pupils' answer sheets. This guide walks through each part of the app.

## 1. Who it is for
- Teachers who want maths exercises tailored to their class (ages 6 to 8, Grades 1 to 3)
- Teachers who want answer sheets marked automatically
- Teachers who want a quick view of each pupil's strengths and gaps

## 2. Getting started

### Requirements
- Docker and Docker Compose
- An OpenAI API key
- A recent web browser

### Start the app
1. Put your key in a `.env` file at the project root: `OPENAI_API_KEY=sk-...`
2. Run `docker compose up --build`
3. Open http://localhost:3000

### Create an account
1. Click **Login** in the top bar, then **Create an account**.
2. Enter your name, email and a password (at least 6 characters).
3. You are signed in and taken back to the exercise chat.

## 3. Creating exercises

![Exercise chat](screenshots/01-chat.png)

1. On the home page, type what you need in the box at the bottom and press the send button.
2. Be specific: grade, topic, number of questions, and a theme if you like.
3. EducAI shows the exercise with its number, a short introduction, the questions with options A to D and the correct answer for each.

![Generated quiz](screenshots/02-generated-quiz.png)

Example requests:
- "5 questions on addition and subtraction within 100 for Grade 2, set at a zoo"
- "A quiz on 2D shapes for Grade 1"
- "6 questions mixing doubles, halves and the 2, 5 and 10 times tables for Grade 3"
- "4 questions on money: adding prices and giving change"

Every generated exercise is saved. Note its number: answer sheets refer to it.

If you have your own curriculum document, upload it under **Curriculum** in the dashboard. New exercises will follow it.

## 4. Marking answer sheets

### Answer sheet format
An answer sheet is a PDF with:
```
Name: Emma Wilson
Pupil ID: 7
Exercise ID: 1
Date: 2026-10-12
Answers:
Q1: A
Q2: C
Q3: A
```
You can create one with `backend/make_answer_sheet.py` (see the README).

### Mark a sheet
1. Open the dashboard (your name in the top bar, then **Dashboard**) and click **Mark Exam**.
2. Choose the PDF and click **Mark this sheet**.
3. EducAI shows the pupil, the exercise, the date and the score, then each question with the pupil's answer and the correct answer. Correct answers are shown in green, wrong ones in red.

![Marking](screenshots/04-marking.png)

4. To change a mark, click **Edit** on that row, set 0 or 1 and click **Save**. The total updates straight away.
5. Click **Validate results** to save the final score for that pupil.

Pupils are created automatically the first time one of their sheets is marked.

## 5. Dashboard

![Dashboard](screenshots/03-dashboard.png)

Use the menu on the left:
- **Dashboard**: a short guide, the average score and the number of exams marked
- **Mark Exam**: upload and mark answer sheets
- **Insights**: statistics and recommendations for each pupil
- **Results**: every exam and each pupil's score
- **Profile**: your account details
- **Curriculum**: upload your curriculum PDF
- **Exercise chat**: back to exercise creation

![Results](screenshots/06-results.png)

## 6. Recommendations

![Recommendations](screenshots/05-recommendations.png)

1. Open **Insights**.
2. Choose a pupil and, if you want, one exercise.
3. Click **Get recommendations**.

You get the pupil's strengths, the areas to improve, teaching recommendations and suggested resources. They are based only on the pupil's validated results, so a pupil who scored 2 out of 4 is never told they got everything right.

## 7. FAQ

**How are exercises made?** The AI reads your request and the most relevant parts of the curriculum, then writes the questions. For each question it writes the working first and marks the matching option as correct.

**Can I reuse exercises?** Yes. Every exercise is saved with its answer key.

**Do the exercises follow a curriculum?** Yes. By default they follow the French Cycle 2 maths programme (ages 6 to 8). Upload your own curriculum to change that.

**An answer sheet was not marked correctly.** Check that the PDF follows the format above and that the exercise ID matches an exercise you created.

**I don't see some pupils.** Pupils appear once one of their sheets has been marked. Check the pupil ID on the sheet.

**The exercise doesn't match my request.** Give more detail: grade, topic, type and number of questions.

**Docker problems.** Check that Docker and Docker Compose are installed and look at `docker compose logs`.
