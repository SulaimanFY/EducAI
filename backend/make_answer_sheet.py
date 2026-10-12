"""Create a typed pupil answer sheet (PDF) in the format EducAI marks.

Example:
    python make_answer_sheet.py --exercise 1 --pupil-id 7 --name "Emma Wilson" \
        --answers B C A D B --out samples/answer_sheet_emma.pdf
"""
import argparse
import os
from datetime import date

import fitz  # PyMuPDF


def make_answer_sheet(exercise_id, pupil_id, name, answers, out_path, sheet_date=None):
    sheet_date = sheet_date or date.today().isoformat()
    lines = [
        f"Name: {name}",
        f"Pupil ID: {pupil_id}",
        f"Exercise ID: {exercise_id}",
        f"Date: {sheet_date}",
        "Answers:",
    ] + [f"Q{number}: {letter.upper()}" for number, letter in enumerate(answers, start=1)]

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 in points
    page.insert_text((72, 90), "EducAI answer sheet", fontsize=20, fontname="helv")
    y = 140
    for line in lines:
        page.insert_text((72, y), line, fontsize=14, fontname="helv")
        y += 28

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    doc.save(out_path)
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--exercise", type=int, required=True, help="Exercise ID shown in the chat")
    parser.add_argument("--pupil-id", type=int, required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--answers", nargs="+", required=True, help="One letter per question, e.g. B C A D")
    parser.add_argument("--date", default=None, help="YYYY-MM-DD (default: today)")
    parser.add_argument("--out", default="samples/answer_sheet.pdf")
    args = parser.parse_args()
    print(make_answer_sheet(args.exercise, args.pupil_id, args.name, args.answers, args.out, args.date))
