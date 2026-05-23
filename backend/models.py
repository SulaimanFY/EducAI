from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from typing import List, Optional
from pydantic import BaseModel, Field

class Eleve(Base):
    __tablename__ = "eleves"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    mot_de_passe = Column(String)
    
    soumissions = relationship("Soumission", back_populates="eleve")
    resultats = relationship("Resultat", back_populates="eleve")

class Programme(Base):
    __tablename__ = "programmes"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String)
    description = Column(String)
    professeur_id = Column(Integer, ForeignKey("professeurs.id"))
    professeur = relationship("Professeur", back_populates="programmes")
    file_path = Column(String)
    exercices = relationship("Exercice", back_populates="programme")

class Professeur(Base):
    __tablename__ = "professeurs"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    mot_de_passe = Column(String)
    programmes = relationship("Programme", back_populates="professeur") 

    exercices = relationship("Exercice", back_populates="professeur")

class Exercice(Base):
    __tablename__ = "exercices"
    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String)
    contenu = Column(String)
    professeur_id = Column(Integer, ForeignKey("professeurs.id"))
    programme_id = Column(Integer, ForeignKey("programmes.id"))

    professeur = relationship("Professeur", back_populates="exercices")
    programme = relationship("Programme", back_populates="exercices")
    qcms = relationship("QCM", back_populates="exercice")
    soumissions = relationship("Soumission", back_populates="exercice")
    resultats = relationship("Resultat", back_populates="exercice")

class QCM(Base):
    __tablename__ = "qcms"
    id = Column(Integer, primary_key=True, index=True)
    exercice_qcm_id = Column(Integer)
    question = Column(String)
    exercice_id = Column(Integer, ForeignKey("exercices.id"))
    
    exercice = relationship("Exercice", back_populates="qcms")
    reponses = relationship("QCMReponse", back_populates="qcm")

class QCMReponse(Base):
    __tablename__ = "qcm_reponses"
    id = Column(Integer, primary_key=True, index=True)
    texte = Column(String)
    est_correct = Column(Boolean, default=False)
    lettre = Column(String)
    qcm_id = Column(Integer, ForeignKey("qcms.id"))
    
    qcm = relationship("QCM", back_populates="reponses")

class Soumission(Base):
    __tablename__ = "soumissions"
    id = Column(Integer, primary_key=True, index=True)
    date_soumission = Column(DateTime, default=datetime.utcnow)
    question = Column(String)
    answer = Column(String)
    eleve_id = Column(Integer, ForeignKey("eleves.id"))
    exercice_id = Column(Integer, ForeignKey("exercices.id"))
    
    eleve = relationship("Eleve", back_populates="soumissions")
    exercice = relationship("Exercice", back_populates="soumissions")
   

class Resultat(Base):
    """Résultat final de correction d'un exercice par un élève.

    Le champ ``score`` stocke un compteur brut : le **nombre de bonnes
    réponses** validées par le professeur pour cet élève sur cet exercice.

    Pour obtenir un pourcentage il faut le rapporter au nombre de questions
    de l'exercice, c'est-à-dire au nombre de lignes correspondantes dans
    ``soumissions`` (ou dans ``qcms``). Ex : ``score = 2`` et 4 questions
    donnent 50 %.
    """

    __tablename__ = "resultats"
    id = Column(Integer, primary_key=True, index=True)
    # Nombre brut de bonnes réponses (PAS un pourcentage). Voir docstring.
    score = Column(Integer)

    eleve_id = Column(Integer, ForeignKey("eleves.id"))
    exercice_id = Column(Integer, ForeignKey("exercices.id"))

    eleve = relationship("Eleve", back_populates="resultats")
    exercice = relationship("Exercice", back_populates="resultats")
   
    
# Modèle pour les recommandations structurées
class Recommendation(BaseModel):
    strengths: List[str] = Field(description="Points forts de l'élève")
    weaknesses: List[str] = Field(description="Points à améliorer")
    recommendations: List[str] = Field(description="Recommandations spécifiques pour aider l'élève")
    resources: List[str] = Field(description="Ressources ou exercices suggérés")

