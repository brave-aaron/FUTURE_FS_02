# FUTURE_FS_02 — Client Lead Management System (Mini CRM) — v2

Version enrichie du Mini CRM : pipeline à 6 étapes, valeur de deal, tableau de bord avec métriques et activité en temps réel, notifications, export CSV, recherche/filtres/tri/pagination.

Cette version reprend le niveau de fonctionnalités d'une implémentation React/Prisma fournie en référence, mais reconstruite en **HTML/CSS/JS vanilla + Node/Express + MySQL** et avec l'identité visuelle bleue d'origine du projet.

## Stack technique
- **Frontend** : HTML / CSS / JavaScript (vanilla, aucun framework)
- **Backend** : Node.js / Express
- **Base de données** : MySQL
- **Auth** : JWT + mots de passe hashés (bcrypt)

## Structure du projet
```
FUTURE_FS_02/
├── database/
│   └── schema.sql          # Tables leads, lead_notes, admins + données de démo
├── backend/
│   ├── server.js
│   ├── db.js                # Pool de connexion MySQL
│   ├── seed.js               # Création du compte admin
│   ├── routes/
│   │   ├── auth.js           # Login admin (JWT)
│   │   ├── leads.js          # CRUD leads + notes, recherche/filtres/tri/pagination
│   │   └── dashboard.js       # Métriques, pipeline, activité récente
│   └── middleware/auth.js     # Protection des routes par token
└── frontend/
    ├── index.html             # Connexion
    ├── dashboard.html          # Tableau de bord
    ├── leads.html              # Gestion des leads
    ├── css/style.css
    └── js/
        ├── api.js              # Fetch authentifié, toasts, notifications (partagé)
        ├── login.js
        ├── dashboard.js
        └── leads.js
```

## Installation

### 1. Base de données
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Édite .env avec tes identifiants MySQL et un JWT_SECRET
npm run seed     # crée le compte admin (admin / admin123)
npm start        # démarre l'API sur http://localhost:5000
```

### 3. Frontend
Ouvre `frontend/index.html` dans le navigateur (ou sers le dossier avec Live Server).

## Identifiants de démonstration
- **Identifiant** : `admin`
- **Mot de passe** : `admin123`

## Fonctionnalités

### Tableau de bord
- Cartes de métriques : total leads, étape qualifiée, taux de conversion, valeur du pipeline
- Barre de répartition du pipeline (qualifié / négociation / converti / perdu)
- Derniers leads enregistrés
- Fil d'activité récente (créations, mises à jour, notes)
- Cloche de notifications avec badge non-lu

### Gestion des leads
- Champs : nom, email, téléphone, **société**, source, statut, **valeur du deal**
- Pipeline à 6 étapes : Nouveau → Qualifié → Contacté → Négociation → Converti / Perdu
- Recherche (nom, email, société), filtres (statut, source), tri (date, nom, valeur)
- Pagination côté serveur
- Tiroir de détail avec notes de suivi (ajout, suppression)
- Création / modification via formulaire modal
- **Export CSV** des leads filtrés
- Notifications toast pour chaque action (succès / erreur)

## Compétences mises en pratique
Opérations CRUD, API REST avec recherche/filtres/tri/pagination, agrégation de métriques côté serveur, gestion de base de données relationnelle, workflows métier (pipeline commercial multi-étapes).
