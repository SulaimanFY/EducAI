# Modèle Conceptuel de Données (MCD)

## Entités et leurs attributs :

1. **Professeur**
   - ID Professeur (PK)
   - Nom
   - Email
   - Mot de passe

2. **Programme**
   - ID Programme (PK)
   - Nom
   - Description
   - ID Professeur (FK)
   - File Path

3. **Exercice**
   - ID Exercice (PK)
   - Titre
   - Contenu
   - ID Professeur (FK)
   - ID Programme (FK)

4. **QCM**
   - ID QCM (PK)
   - Exercice QCM ID
   - Question
   - ID Exercice (FK)

5. **QCM Réponse**
   - ID QCM Réponse (PK)
   - Texte
   - Est Correct (booléen)
   - Lettre
   - ID QCM (FK)

6. **Élève**
   - ID Élève (PK)
   - Nom
   - Email
   - Mot de passe

7. **Soumission**
   - ID Soumission (PK)
   - Date de soumission
   - Question
   - Answer
   - ID Élève (FK)
   - ID Exercice (FK)

8. **Résultat**
   - ID Résultat (PK)
   - Score
   - ID Élève (FK)
   - ID Exercice (FK)

## Associations :
- Un **professeur** crée plusieurs **exercices** et **programmes**
- Un **programme** appartient à un **professeur** et contient plusieurs **exercices**
- Un **exercice** appartient à un **programme** et à un **professeur**
- Un **exercice** contient plusieurs **QCM**
- Un **QCM** possède plusieurs **QCM Réponses**, dont une ou plusieurs correctes
- Un **élève** soumet plusieurs **soumissions** pour différents **exercices**
- Un **élève** obtient plusieurs **résultats** pour différents **exercices**

Ce modèle conceptuel permet une gestion efficace des exercices de mathématiques sous forme de QCM et assure un suivi des performances des élèves. 📊
