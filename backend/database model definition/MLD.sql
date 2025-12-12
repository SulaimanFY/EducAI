-- Modèle Logique de Données pour le système de gestion des exercices de math

CREATE TABLE professeurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    mot_de_passe VARCHAR NOT NULL
);

CREATE TABLE programmes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR NOT NULL,
    description VARCHAR,
    professeur_id INTEGER REFERENCES professeurs(id),
    file_path VARCHAR
);

CREATE TABLE exercices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre VARCHAR NOT NULL,
    contenu VARCHAR NOT NULL,
    professeur_id INTEGER REFERENCES professeurs(id),
    programme_id INTEGER REFERENCES programmes(id)
);

CREATE TABLE qcms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercice_qcm_id INTEGER,
    question VARCHAR NOT NULL,
    exercice_id INTEGER REFERENCES exercices(id)
);

CREATE TABLE qcm_reponses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texte VARCHAR NOT NULL,
    est_correct BOOLEAN DEFAULT 0,
    lettre VARCHAR,
    qcm_id INTEGER REFERENCES qcms(id)
);

CREATE TABLE eleves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    mot_de_passe VARCHAR NOT NULL
);

CREATE TABLE soumissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_soumission DATETIME DEFAULT CURRENT_TIMESTAMP,
    question VARCHAR,
    answer VARCHAR,
    eleve_id INTEGER REFERENCES eleves(id),
    exercice_id INTEGER REFERENCES exercices(id)
);

CREATE TABLE resultats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    score INTEGER,
    eleve_id INTEGER REFERENCES eleves(id),
    exercice_id INTEGER REFERENCES exercices(id)
);

-- Indexes pour optimiser les performances
CREATE INDEX idx_professeurs_email ON professeurs(email);
CREATE INDEX idx_eleves_email ON eleves(email);
CREATE INDEX idx_exercices_professeur ON exercices(professeur_id);
CREATE INDEX idx_exercices_programme ON exercices(programme_id);
CREATE INDEX idx_soumissions_eleve ON soumissions(eleve_id);
CREATE INDEX idx_soumissions_exercice ON soumissions(exercice_id);
CREATE INDEX idx_resultats_eleve ON resultats(eleve_id);
CREATE INDEX idx_resultats_exercice ON resultats(exercice_id);
CREATE INDEX idx_qcms_exercice ON qcms(exercice_id);
CREATE INDEX idx_qcm_reponses_qcm ON qcm_reponses(qcm_id);

CREATE TABLE Suggestion (
    id_suggestion SERIAL PRIMARY KEY,
    id_professeur INT REFERENCES Professeur(id_professeur),
    id_exercice INT REFERENCES Exercice(id_exercice),
    contenu TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajout des tables necessaires pour la correction automatique des copies

-- Table Soumission : Stocke les copies soumises par les élèves
CREATE TABLE Soumission (
    id_soumission SERIAL PRIMARY KEY,
    id_eleve INT REFERENCES Eleve(id_eleve),
    id_exercice INT REFERENCES Exercice(id_exercice),
    date_soumission TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Correction : Associe chaque soumission avec une correction et un score
CREATE TABLE Correction (
    id_correction SERIAL PRIMARY KEY,
    id_soumission INT REFERENCES Soumission(id_soumission),
    score FLOAT,
    feedback TEXT
);

-- Table Performance : Suivi des performances des élèves par chapitre
CREATE TABLE Performance (
    id_performance SERIAL PRIMARY KEY,
    id_eleve INT REFERENCES Eleve(id_eleve),
    id_programme INT REFERENCES Programme(id_programme),
    chapitre VARCHAR(255),
    score_moyen FLOAT
);

-- Table Recommandation : Suggestions d'amélioration pour chaque élève
CREATE TABLE Recommandation (
    id_recommandation SERIAL PRIMARY KEY,
    id_eleve INT REFERENCES Eleve(id_eleve),
    chapitre VARCHAR(255),
    suggestion TEXT
);

