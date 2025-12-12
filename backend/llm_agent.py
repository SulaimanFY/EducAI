# llm_agent.py
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.output_parsers import PydanticOutputParser
from langchain.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain.schema import HumanMessage, SystemMessage
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain_community.tools import DuckDuckGoSearchRun
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from sqlalchemy import text, inspect
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser  # Make sure this is installed
from langchain.output_parsers import PydanticOutputParser
from models import Recommendation, Programme
import json
import re
import sqlite3
from typing import Annotated, TypedDict
import os

llm = ChatOpenAI(
    model_name="gpt-4o",
    temperature=0.7,
    max_tokens=4000
)

QCM_PROMPT_TEMPLATE = PromptTemplate(
    input_variables=["programme"],
    template="""
    Rôle :  
    Tu es un assistant pédagogique spécialisé en mathématiques pour les élèves du cycle 2 (CP, CE1, CE2).  
    Ton objectif est de générer des exercices variés sous forme de QCM, en couvrant tout le programme officiel de manière ludique et engageante.
    Génère des exercices sous forme de QCM en respectant ces règles :
    - Le QCM doit contenir une question et 4 choix de réponses.
    - Une seule réponse doit être correcte.
    - Le contexte doit être ludique et adapté aux enfants du cycle 2.
    - Le QCM doit couvrir le programme suivant : {programme}
    
**Consignes pour la génération des exercices :**  
1️⃣ **Diversité et créativité :**  
   - Évite de répéter les mêmes types d'exercices d'une question à l'autre.  
   - Intègre des **mises en situation concrètes** adaptées aux enfants (ex: comptage de billes, partage de bonbons, achat au marché, mesure d'objets du quotidien, etc.).  
   - Utilise des **contextes variés** pour rendre les questions plus engageantes (ex : école, aventure, histoire, animaux, sport, voyage).  

2️⃣ **Respect du programme du cycle 2 :**  
   - **Numération** (comparer, ranger des nombres, écrire en lettres).  
   - **Calculs** (additions, soustractions, multiplications simples, doubles et moitiés).  
   - **Grandeurs et mesures** (temps, monnaie, longueurs, masses).  
   - **Géométrie** (formes, symétries, tracés, orientation dans l'espace).  
   - **Problèmes logiques** (résolution de petites énigmes adaptées aux élèves).  

3️⃣ **Format standardisé du QCM :**  
   - Chaque exercice contient une question et **4 choix de réponse** (A, B, C, D).  
   - Indique **la bonne réponse** sous forme claire et précise.  
   - Formule les questions **de manière simple et accessible** aux enfants du cycle 2.  

**Refuser poliment les sujets hors mathématiques du cycle 2**  
Si l'utilisateur pose une question hors sujet, réponds :  
*"Je suis un assistant dédié uniquement aux exercices de mathématiques pour les élèves du cycle 2. Peux-tu préciser un domaine des maths du cycle 2 sur lequel tu aimerais un QCM ?"*  

Ne réponds à aucune autre demande en dehors de ce cadre.  

**Mission principale :**  
Crée des QCM variés, uniques et pédagogiques pour les élèves du cycle 2, sans répétition et avec des mises en situation réalistes, les questions doivent être originales et pertinentes et porter sur plusieurs domaines du programme ! Pour chaque exercice, tu dois générer au moins 5 questions.   

    
    Réponds au format JSON suivant :
    {{
        "titre": "Titre de l'exercice",
        "contenu": "Contexte de l'exercice",
        "qcm": [
            {{
                "question": "texte de la question",
                "id_qcm": "Q1",
                "reponses": [
                    {{"texte": "texte de la réponse A", "est_correct": false, "lettre": "A"}},
                    {{"texte": "texte de la réponse B", "est_correct": false, "lettre": "B"}},
                    {{"texte": "texte de la réponse C", "est_correct": true, "lettre": "C"}},
                    {{"texte": "texte de la réponse D", "est_correct": false, "lettre": "D"}}
                ]
            }}
        ]
    }}
    """
)

def invoke_generate_qcm_agent(prompt, professeur_id, db):
    # Récupérer le curriculum spécifique du professeur à partir de son ID
    professor_curriculum = get_professor_curriculum(professeur_id, db)
    
    # Si aucun curriculum spécifique n'est trouvé ou s'il est incomplet
    if not professor_curriculum :
        # Vérifier si le programme/curriculum est mentionné dans le prompt
        if "programme" in prompt.lower() or "curriculum" in prompt.lower():
            # Rechercher le curriculum dans un PDF local
            pdf_path = "program/cycle2_maths.pdf"
            retriever = load_pdf_curriculum(pdf_path)
            
            if retriever:
                # Extraire l'information pertinente du PDF
                results = retriever.get_relevant_documents(prompt)
                curriculum_info = results[0].page_content if results else "Aucune info trouvée."
            else:
                # Rechercher le curriculum en ligne si le PDF n'existe pas
                curriculum_info = fetch_latest_curriculum() or "Impossible de récupérer le programme."
                
                # Sauvegarder ce curriculum pour une utilisation future par le professeur
                if curriculum_info and curriculum_info != "Impossible de récupérer le programme.":
                    save_professor_curriculum(professeur_id, curriculum_info)
            
            # Utiliser le curriculum trouvé
            programme_context = curriculum_info
        else:
            # Utiliser un curriculum par défaut pour le cycle 2
            programme_context = "Programme de mathématiques du cycle 2 (CP, CE1, CE2) incluant la numération, le calcul, la géométrie et les mesures."
    else:
        # Utiliser le curriculum spécifique du professeur
        programme_context = professor_curriculum
    
    # Enrichir le prompt avec les informations du curriculum si nécessaire
    if "programme" or "curriculum" not in prompt:
        programme_complet = f"{prompt}\n\nProgramme à couvrir: {programme_context}"
    else:
        programme_complet = prompt
    
    # Générer le QCM avec le programme complet
    chain = QCM_PROMPT_TEMPLATE | llm | StrOutputParser()
    qcm_json = chain.invoke({"programme": programme_complet})
   
    if not qcm_json:  # Vérifie si la sortie est vide ou None
        raise ValueError("La sortie de l'IA est vide. Vérifie le modèle et le prompt.")
    
    # Extraire le premier objet JSON valide, en recherchant d'abord un bloc code JSON
    json_content = None
    
    # Cas 1: Essayer d'extraire à partir d'un bloc de code markdown
    json_blocks = re.findall(r"```(?:json)?\n(.*?)\n```", qcm_json, re.DOTALL)
    if json_blocks:
        json_content = json_blocks[0].strip()
    else:
        # Cas 2: Pas de bloc markdown, essayer directement le contenu
        json_content = qcm_json.strip()
    
    try:
        return json.loads(json_content)
    except json.JSONDecodeError as e:
        print(f"Erreur JSON: {e}")
        print(f"Sortie brute après nettoyage: {repr(json_content)}")
        # Tenter une dernière solution - extraire seulement le premier objet JSON valide
        try:
            # Trouver les accolades ouvrantes et fermantes correspondantes pour extraire le 1er objet JSON complet
            depth = 0
            start_pos = json_content.find('{')
            
            if start_pos >= 0:
                for i in range(start_pos, len(json_content)):
                    if json_content[i] == '{':
                        depth += 1
                    elif json_content[i] == '}':
                        depth -= 1
                        if depth == 0:
                            # On a trouvé un objet JSON complet
                            return json.loads(json_content[start_pos:i+1])
        except Exception as e2:
            print(f"Échec de l'extraction d'un objet JSON valide: {e2}")
        
        raise ValueError(f"Impossible de parser la réponse en JSON: {e}")


FORMAT_PROMPT = """
Rôle : system
content : "Tu es un assistant pédagogique chargé de formater des exercices mathématiques sous forme de QCM pour un examen. Les données brutes fournies sont extraites d'une base de données et doivent être restructurées de manière claire et lisible.  

### Format attendu :  
Chaque exercice est présenté avec :  
- L'Id de l'exercice
- Un titre correspondant au nom du module  
- Une introduction expliquant le contexte  
- Une question suivie de plusieurs choix de réponses  
- La réponse correcte doit être identifiée  

### Exemple de formatage :  
**Titre : Aventure Mathématique au Pays des Nombres**  
**Introduction :** Bienvenue dans l'aventure mathématique au Pays des Nombres ! Tu vas aider le petit lapin à résoudre des problèmes pour retrouver sa maison. Prêt ? C'est parti !  

**Question 1 :**  
Le petit lapin a 10 bonbons. Il en donne 4 à son ami. Combien lui reste-t-il de bonbons ?  

A) 4  
B) 5  
C) 6  
D) 7  

**Réponse correcte :** B) 6  

### Instructions :  
- Agrège les questions par module en conservant l'introduction et la mise en contexte  
- Formate les réponses sous forme de liste (A, B, C, D)  
- Mets en avant la bonne réponse sans l'afficher directement pour l'élève  
- Respecte une présentation propre et aérée"
"""


def convert_query_result_to_string(query_result):
    return "\n".join([str(record) for record in query_result])

def format_qcm_data(query_result, new_exercise):
    query_result_string = convert_query_result_to_string(f"Exercice {new_exercise.id}  : {query_result}")
    # Définition du prompt utilisateur
    user_prompt = f"Format les données pour la lisibilité avec le numéro de l'exercice en premier et le titre en second {query_result_string}"

    # Envoi des messages au modèle
    response = llm.invoke([
        SystemMessage(content=FORMAT_PROMPT),  # System Prompt
        HumanMessage(content=user_prompt)      # Question de l'utilisateur
    ])

    # Affichage de la réponse
    return response.content


EXTRACTION_PROMPT = PromptTemplate(
    input_variables=["texte_extrait"],
    template="""
Analyse le texte ci-dessous issu d'un élève et structure les informations sous format JSON.
Identifie :
- L'ID de l'élève
- L'ID de l'exercice
- Le nom de l'élève
- La date de soumission
- Les réponses aux questions sous forme de liste

Texte extrait :
{texte_extrait}

Réponse attendue (format JSON) :
{{
  "id_eleve": "",
  "nom_eleve": "",
  "id_exercice": "",
  "date_soumission": "",
  "reponses": [
    {{"id_exercice": 1, "question": Q1, "reponse_choisie": "A"}},
    {{"id_exercice": 1, "question": Q2, "reponse_choisie": "B"}}
  ]
}}
""",
)


def invoke_analyze_student_copy_agent(text: str):
    chain = EXTRACTION_PROMPT | llm | StrOutputParser()
    qcm_json = chain.invoke({"texte_extrait": text})
    if not qcm_json:
        raise ValueError("La sortie de l'IA est vide. Vérifie le modèle et le prompt.")
    match = re.search(r"```json\n(.*?)\n```", qcm_json, re.DOTALL)
    if match:
        qcm_json_clean = match.group(1).strip()
    else:
        qcm_json_clean = qcm_json.strip()
    try:
        return json.loads(qcm_json_clean)
    except json.JSONDecodeError as e:
        print(f"Erreur JSON: {e}")
        print(f"Sortie brute après nettoyage: {repr(qcm_json_clean)}")
        raise



def invoke_llm(prompt: str) -> str:
    """
    Invoque l'agent LLM avec le prompt fourni et retourne la réponse.
    """
    response = llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]).content
    return response


def invoke_llm_recommendation_agent(student_name, student_email, performance_details):
    """Generate personalized recommendations for a student based on their performance"""
    
    # Setup the parser
    parser = PydanticOutputParser(pydantic_object=Recommendation)
    
    # Create the prompt template
    student_recommendation_template = PromptTemplate( 
        input_variables=["nom_eleve", "email", "performance_details"],
        template="""
Tu es un assistant pédagogique intelligent qui aide les professeurs à mieux comprendre les forces et faiblesses de leurs élèves.

Voici les informations sur l'élève {nom_eleve} {email}:

Performance par exercice:
{performance_details}

Basé sur ces données, génère des recommandations personnalisées pour aider cet élève à progresser.
Les recommandations doivent être spécifiques, actionables et adaptées au niveau de l'élève.

{format_instructions}
""",
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    # Create the chain properly
    chain = student_recommendation_template | llm | parser
    
    # Invoke the chain with input variables
    result = chain.invoke({
        "nom_eleve": student_name,
        "email": student_email,
        "performance_details": performance_details
    })
    
    return result 



# ======================================================
# PDF CURRICULUM LOADER
# ======================================================
def load_pdf_curriculum(pdf_path):
    if os.path.exists(pdf_path):
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_documents(documents)
        vectorstore = FAISS.from_documents(chunks, OpenAIEmbeddings())
        retriever = vectorstore.as_retriever()
        return retriever
    return None


def fetch_latest_curriculum():
    search_tool = DuckDuckGoSearchRun()
    results = search_tool.invoke("Cycle 2 math programme France site:education.gouv.fr")
    return results if results else None



class State(TypedDict):
    messages: Annotated[list, add_messages]


def chatbot_agent(state: State):
    user_message = state["messages"][-1].content.lower()
    if "programme" in user_message or "curriculum" in user_message:
        pdf_path = "program/cycle2_maths.pdf"
        retriever = load_pdf_curriculum(pdf_path)
        if retriever:
            results = retriever.get_relevant_documents(user_message)
            curriculum_info = (
                results[0].page_content if results else "Aucune info trouvée."
            )
        else:
            curriculum_info = (
                fetch_latest_curriculum() or "Impossible de récupérer le programme."
            )
        response = generate_qcm_based_on_curriculum(user_message + curriculum_info)
    else:
        response = llm.invoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_message)]
        ).content
    return {"messages": [HumanMessage(content=response)]}


graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot_agent)
graph_builder.set_entry_point("chatbot")
graph_builder.add_edge("chatbot", END)
chatbot = graph_builder.compile()

def get_professor_curriculum(professeur_id, db):
    """
    Récupère le curriculum spécifique d'un professeur depuis la base de données.
    """
    try:
        # Utiliser la session SQLAlchemy pour récupérer le programme
        result = db.query(Programme).filter(Programme.professeur_id == professeur_id).first()
        
        if result and result.file_path:
            # Récupérer le contenu du fichier PDF
            retriever = load_pdf_curriculum(result.file_path)
            # Retourner le curriculum s'il existe
            return retriever
        return None
    except Exception as e:
        print(f"Erreur lors de la récupération du curriculum: {e}")
        return None

def save_professor_curriculum(professeur_id, curriculum, db):
    """
    Sauvegarde le curriculum pour un professeur spécifique.
    """
    try:
        # Utiliser la session SQLAlchemy pour mettre à jour le programme
        programme = db.query(Programme).filter(Programme.professeur_id == professeur_id).first()
        
        if programme:
            programme.description = curriculum
            db.commit()
            return True
        else:
            print(f"Avertissement: Professeur ID {professeur_id} non trouvé dans la base de données")
            return False
    except Exception as e:
        print(f"Erreur lors de la sauvegarde du curriculum: {e}")
        db.rollback()
        return False

