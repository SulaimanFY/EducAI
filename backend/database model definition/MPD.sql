-- Modèle Physique de Données pour SQLite

CREATE TABLE Professeur (
    id_professeur INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL
);

CREATE TABLE Programme (
    id_programme INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    description TEXT
);

CREATE TABLE Exercice (
    id_exercice INTEGER PRIMARY KEY AUTOINCREMENT,
    id_professeur INTEGER NOT NULL,
    id_programme INTEGER NOT NULL,
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,
    FOREIGN KEY (id_professeur) REFERENCES Professeur(id_professeur),
    FOREIGN KEY (id_programme) REFERENCES Programme(id_programme)
);

CREATE TABLE QCM (
    id_qcm INTEGER PRIMARY KEY AUTOINCREMENT,
    id_exercice INTEGER NOT NULL,
    question TEXT NOT NULL,
    FOREIGN KEY (id_exercice) REFERENCES Exercice(id_exercice)
);

CREATE TABLE Reponse (
    id_reponse INTEGER PRIMARY KEY AUTOINCREMENT,
    id_qcm INTEGER NOT NULL,
    texte TEXT NOT NULL,
    est_correct BOOLEAN NOT NULL,
    FOREIGN KEY (id_qcm) REFERENCES QCM(id_qcm)
);

CREATE TABLE Eleve (
    id_eleve INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL
);

CREATE TABLE Resultat (
    id_resultat INTEGER PRIMARY KEY AUTOINCREMENT,
    id_eleve INTEGER NOT NULL,
    id_exercice INTEGER NOT NULL,
    score INTEGER NOT NULL,
    date_submission TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_eleve) REFERENCES Eleve(id_eleve),
    FOREIGN KEY (id_exercice) REFERENCES Exercice(id_exercice)
);

CREATE TABLE Suggestion (
    id_suggestion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_professeur INTEGER NOT NULL,
    id_exercice INTEGER NOT NULL,
    contenu TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_professeur) REFERENCES Professeur(id_professeur),
    FOREIGN KEY (id_exercice) REFERENCES Exercice(id_exercice)
);
