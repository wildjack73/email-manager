# Guide de Démarrage Rapide 🚀

## Installation en 5 minutes

### 1. Prérequis
- Node.js 18+ installé
- PostgreSQL installé (ou compte Railway/Render)
- Clé API Anthropic (https://console.anthropic.com)
- Accès IMAP à votre email OVH

### 2. Installation

```bash
cd email-manager/backend
npm install
```

### 3. Configuration

Créez le fichier `backend/.env` :

```env
EMAIL_HOST=ssl0.ovh.net
EMAIL_PORT=993
EMAIL_USER=votre-email@domaine.com
EMAIL_PASSWORD=votre-mot-de-passe
EMAIL_TLS=true

ANTHROPIC_API_KEY=sk-ant-api03-VOTRE-CLE

DATABASE_URL=postgresql://localhost:5432/email_manager

PORT=3000
NODE_ENV=development
SESSION_SECRET=changez-moi-par-une-chaine-aleatoire

DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=changeme

SCHEDULER_INTERVAL_MINUTES=5
PROTECTED_DOMAINS=gouv.fr,urssaf.fr,impots.gouv.fr
```

### 4. Démarrage

```bash
npm start
```

### 5. Accès

Ouvrez http://localhost:3000

Login avec : `admin` / `changeme`

## 🌐 Déploiement Railway (Production)

1. Créer compte sur https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Ajouter service "PostgreSQL"
4. Configurer les variables d'environnement (copier depuis .env)
5. Déployer !

Railway génère une URL publique (ex: `https://votre-app.up.railway.app`)

## 📝 Premiers Pas

1. **Ajoutez vos domaines whitelist** (impôts, banques, etc.)
2. **Ajoutez des mots-clés à bannir** (casino, promo, etc.)
3. **Cliquez "Exécuter maintenant"** pour tester
4. **Surveillez les logs** pour vérifier le fonctionnement

## ⚠️ Important

⚠️ **Testez d'abord avec une boîte email de test !**

Le système supprime automatiquement des emails. Assurez-vous qu'il fonctionne correctement avant de l'utiliser sur votre boîte principale.

## 🆘 Problèmes courants

**Erreur de connexion email** → Vérifiez EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD

**Erreur Claude AI** → Vérifiez votre clé API et votre crédit Anthropic

**Base de données** → Vérifiez que PostgreSQL est lancé et DATABASE_URL correct

## 📖 Documentation complète

Consultez [README.md](file:///C:/Users/wildj/.gemini/antigravity/scratch/email-manager/README.md) pour plus de détails.
