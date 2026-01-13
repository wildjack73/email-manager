# 🚀 Configuration Rapide - Email Manager

## Étape 1 : Créer le fichier .env

Dans le dossier `backend/`, créez un fichier nommé `.env` (sans extension) avec ce contenu :

```env
# Email OVH Exchange
EMAIL_HOST=ex.mail.ovh.net
EMAIL_PORT=993
EMAIL_USER=VOTRE_EMAIL@DOMAINE.COM
EMAIL_PASSWORD=VOTRE_MOT_DE_PASSE
EMAIL_TLS=true

# Claude AI - Votre clé API
ANTHROPIC_API_KEY=VOTRE_CLE_API_CLAUDE

# Database PostgreSQL
DATABASE_URL=postgresql://localhost:5432/email_manager

# Serveur
PORT=3000
NODE_ENV=development
SESSION_SECRET=mon-secret-aleatoire-12345

# Login Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=admin123

# Scheduler
SCHEDULER_INTERVAL_MINUTES=5

# Domaines protégés
PROTECTED_DOMAINS=gouv.fr,urssaf.fr,impots.gouv.fr,ameli.fr
```

## Étape 2 : Remplir vos informations

Modifiez ces lignes :
- `EMAIL_USER` : Votre adresse email complète
- `EMAIL_PASSWORD` : Votre mot de passe email
- `ANTHROPIC_API_KEY` : Votre clé API Claude

## Étape 3 : Base de données

**Option Facile - Railway (recommandé pour tests)** :
1. Allez sur https://railway.app
2. Créez un compte gratuit
3. Créez un nouveau projet
4. Ajoutez un service PostgreSQL
5. Copiez le `DATABASE_URL` généré
6. Collez-le dans votre `.env`

**Option PostgreSQL Local** (si installé) :
```bash
# Créer la base
psql -U postgres
CREATE DATABASE email_manager;
\q
```
Puis dans `.env` : `DATABASE_URL=postgresql://postgres:votrepassword@localhost:5432/email_manager`

## Étape 4 : Démarrer

```bash
cd backend
npm start
```

## Étape 5 : Accéder au dashboard

Ouvrez : http://localhost:3000

**Login :** admin  
**Password :** admin123

---

✅ **C'est prêt !** Le système va se connecter à votre boîte email et commencer à classifier vos emails toutes les 5 minutes.
