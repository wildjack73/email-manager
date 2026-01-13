# 🐛 Problème de Démarrage - Checklist

Le serveur ne démarre pas. Voici les vérifications à faire :

## Vérifications Nécessaires

### 1. Fichier .env existe-t-il ?
- Le fichier `.env` doit être dans le dossier `backend/`
- Chemin complet : `email-manager/backend/.env`
- **PAS** à la racine du projet

### 2. Contenu du fichier .env

Le fichier doit contenir TOUTES ces lignes (avec vos vraies valeurs) :

```env
EMAIL_HOST=ex.mail.ovh.net
EMAIL_PORT=993
EMAIL_USER=votre-email@domaine.com
EMAIL_PASSWORD=votre-mot-de-passe-email
EMAIL_TLS=true

ANTHROPIC_API_KEY=sk-ant-api03-VOTRE-CLE-ICI

DATABASE_URL=postgresql://postgres:YcVkltoaMcmNSjyjJrzTCyielGhhEBuB@caboose.proxy.rlwy.net:39159/railway

PORT=3000
NODE_ENV=development
SESSION_SECRET=secret-random-12345
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=admin123
SCHEDULER_INTERVAL_MINUTES=5
PROTECTED_DOMAINS=gouv.fr,urssaf.fr,impots.gouv.fr,ameli.fr
```

### 3. Points Critiques

- ✅ `DATABASE_URL` doit être sur UNE SEULE ligne (pas de retour à la ligne)
- ✅ Pas d'espaces avant ou après le `=`
- ✅ `EMAIL_USER` = votre adresse email complète
- ✅ `EMAIL_PASSWORD` = votre mot de passe email (pas celui de Railway)
- ✅ `ANTHROPIC_API_KEY` = votre clé API Claude (commence par `sk-ant-`)

## Action Requise

**Vérifiez votre fichier `.env` et assurez-vous qu'il contient toutes ces variables.**

Si tout est correct, le problème vient d'ailleurs et je pourrai investiguer plus en détail.
