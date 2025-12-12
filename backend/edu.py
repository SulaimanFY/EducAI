from io import BytesIO

import openai
import pytesseract
from fastapi import FastAPI, File, UploadFile
from PIL import Image

# Initialisation de l'application FastAPI
app = FastAPI()

# Configuration du modèle LLM (utilisation d'un modèle open-source, ex: GPT-3.5-turbo via OpenAI ou une alternative comme Mistral)
openai.api_key = "[Enter your Key]"


# Fonction pour extraire le texte d'une image (scan de l'exercice)
def extract_text_from_image(image: bytes) -> str:
    image = Image.open(BytesIO(image))
    text = pytesseract.image_to_string(image, lang="fra")
    return text


# Route pour générer un exercice du cycle 2
@app.get("/generate_exercise")
def generate_exercise(level: str = "CE1", topic: str = "addition"):
    prompt = f"Génère un exercice de mathématiques pour un élève de {level} sur le thème '{topic}'."
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {
                "role": "system",
                "content": "Tu es un assistant pédagogique spécialisé en mathématiques du cycle 2.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    return {"exercise": response["choices"][0]["message"]["content"]}


# Route pour corriger un exercice soumis sous forme de scan
@app.post("/correct_exercise")
def correct_exercise(file: UploadFile = File(...)):
    text_extracted = extract_text_from_image(file.file.read())

    correction_prompt = f"Corrige cet exercice de mathématiques et donne la réponse correcte : {text_extracted}"
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {
                "role": "system",
                "content": "Tu es un assistant pédagogique qui corrige des exercices du cycle 2.",
            },
            {"role": "user", "content": correction_prompt},
        ],
    )
    return {"correction": response["choices"][0]["message"]["content"]}


# Déploiement prévu dans un environnement de production via Docker et Kubernetes
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
