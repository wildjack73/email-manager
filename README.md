# Email Manager 📧

Système automatisé de tri d'emails utilisant l'IA Claude d'Anthropic pour classifier et gérer vos emails automatiquement.

## 🌟 Fonctionnalités

- ✅ **Connexion IMAP** à votre boîte email OVH Exchange
- 🤖 **Classification IA** via Claude (Anthropic) : SPAM, INUTILE, IMPORTANT
- 🗑️ **Suppression automatique** des emails indésirables
- 🔒 **Règles de sécurité** : protection des domaines .gouv.fr, banques, impôts, etc.
- ⏰ **Scheduler automatique** : vérification toutes les 5 minutes
- 📊 **Dashboard web** moderne avec statistiques en temps réel
- ✨ **Whitelist** de domaines à ne jamais supprimer
- 🚫 **Mots-clés bannis** pour filtrage automatique
- 💾 **Base de données** PostgreSQL pour traçabilité

## 🚀 Installation

### Prérequis

- Node.js 18+ et npm
- PostgreSQL (ou utiliser une base hébergée sur Railway/Render)
- Clé API Anthropic (Claude)
- Accès IMAP à votre boîte email OVH Exchange

### Installation locale

1. **Cloner ou télécharger le projet**

2. **Installer les dépendances backend**
```bash
cd backend
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env` dans le dossier `backend/` :

```env
# Email Configuration (OVH Exchange)
EMAIL_HOST=ssl0.ovh.net
EMAIL_PORT=993
EMAIL_USER=votre-email@votredomaine.com
EMAIL_PASSWORD=votre-mot-de-passe
EMAIL_TLS=true

# Claude AI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-VOTRE-CLE-API

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/email_manager

# Server
PORT=3000
NODE_ENV=development

# Session Secret (générer une chaîne aléatoire)
SESSION_SECRET=changez-moi-par-une-chaine-aleatoire-securisee

# Dashboard Authentication
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=changeme

# Scheduler
SCHEDULER_INTERVAL_MINUTES=5

# Protected domains (séparés par des virgules)
PROTECTED_DOMAINS=gouv.fr,urssaf.fr,impots.gouv.fr,ameli.fr
```

4. **Initialiser la base de données**

La base de données sera automatiquement initialisée au démarrage. Si vous voulez la créer manuellement :

```bash
psql -U postgres -d email_manager -f ../database/schema.sql
```

5. **Démarrer le serveur**

```bash
npm start
# Ou pour le développement avec rechargement automatique :
npm run dev
```

6. **Accéder au dashboard**

Ouvrez votre navigateur : http://localhost:3000

Connectez-vous avec les identifiants définis dans `.env`

## ☁️ Déploiement sur Railway.app

Railway offre un déploiement gratuit (avec limitations) puis payant (~$5/mois).

### Étapes :

1. **Créer un compte sur [Railway.app](https://railway.app)**

2. **Créer un nouveau projet** > Deploy from GitHub repo

3. **Ajouter une base PostgreSQL** : 
   - Dans votre projet Railway, cliquez "New" > "Database" > "PostgreSQL"
   - Railway génère automatiquement `DATABASE_URL`

4. **Configurer les variables d'environnement** :
   - Dans les paramètres du service, ajoutez toutes les variables du `.env`
   - `DATABASE_URL` sera automatiquement définie par Railway

5. **Déployer** :
   - Railway détecte automatiquement Node.js
   - Le fichier `railway.json` configure le démarrage
   - Déploiement automatique à chaque push Git

6. **Obtenir l'URL publique** :
   - Railway génère une URL (ex: `https://votre-app.up.railway.app`)
   - Accédez à votre dashboard via cette URL

## 📖 Utilisation

### Dashboard

Le dashboard web permet de :

- **Voir les statistiques** : emails traités, spam supprimés, taux de suppression
- **Consulter l'historique** : tous les emails traités avec leur classification
- **Gérer la whitelist** : ajouter des domaines à ne jamais supprimer
- **Gérer les mots-clés** : bannir des mots-clés spécifiques
- **Lancer manuellement** : forcer une vérification immédiate

### Whitelist

Ajoutez des domaines importants :
- `urssaf.fr`
- `impots.gouv.fr`
- `mabanque.fr`
- etc.

Les emails de ces domaines ne seront **JAMAIS** supprimés.

### Mots-clés bannis

Ajoutez des mots-clés à bannir automatiquement :
- `casino`
- `promo`
- `newsletter`
- etc.

Les emails contenant ces mots seront supprimés immédiatement.

### Règles de sécurité intégrées

Le système protège automatiquement :
- Tous les domaines `.gouv.fr`
- Les domaines contenant : `banque`, `bank`, `fiscal`, etc.
- Tous les domaines dans `PROTECTED_DOMAINS`

**En cas de doute, le système garde toujours l'email par sécurité.**

## 🔧 Configuration avancée

### Changer l'intervalle du scheduler

Dans `.env` :
```env
SCHEDULER_INTERVAL_MINUTES=5  # Toutes les 5 minutes
```

### Changer le modèle Claude

Dans `.env` :
```env
CLAUDE_MODEL=claude-3-5-sonnet-20241022  # Recommandé
# Ou
CLAUDE_MODEL=claude-3-opus-20240229      # Plus puissant mais plus cher
```

### Ajouter des domaines protégés par défaut

Dans `.env`, ajoutez-les séparés par des virgules :
```env
PROTECTED_DOMAINS=gouv.fr,urssaf.fr,impots.gouv.fr,notaires.fr,avocats.fr
```

## 💰 Coûts estimés

- **API Claude** : ~$0.01-0.03 par email (selon le modèle)
- **Hébergement Railway** : 
  - Gratuit avec limitations ($5 de crédit/mois)
  - Hobby plan : $5/mois
  - Base PostgreSQL : incluse
- **Total estimé** : $5-20/mois selon le volume d'emails

## 🐛 Dépannage

### L'application ne démarre pas

Vérifiez :
- PostgreSQL est accessible
- Les variables d'environnement sont correctes
- Les dépendances sont installées (`npm install`)

### Impossible de se connecter au serveur email

Vérifiez :
- `EMAIL_HOST`, `EMAIL_PORT` corrects pour OVH
- `EMAIL_USER` et `EMAIL_PASSWORD` valides
- IMAP est activé sur votre compte OVH

### Erreurs Claude AI

Vérifiez :
- Votre clé API `ANTHROPIC_API_KEY` est valide
- Vous avez du crédit disponible sur votre compte Anthropic

### Les emails ne sont pas supprimés

- Vérifiez que le domaine n'est pas dans la whitelist
- Vérifiez les logs pour voir la classification
- Le système est conservateur : en cas de doute, il garde l'email

## 📝 Logs

Les logs sont affichés dans la console. Pour Railway, consultez les logs dans le dashboard Railway.

Exemple de log :
```
🚀 Starting email classification process...
📬 Found 3 unread emails
📧 Processing: Newsletter from marketing@example.com
🤖 Claude classified as: INUTILE
🗑️ Email moved to trash
✅ Classification complete: 3 processed, 2 deleted, 1 kept
```

## 🔐 Sécurité

- Les mots de passe sont en clair dans `.env` (à sécuriser en production)
- Les sessions utilisent des cookies HTTP-only
- Les communications avec la base de données utilisent SSL en production
- **Ne commitez JAMAIS le fichier `.env` sur Git**

## 🛠️ Stack technique

- **Backend** : Node.js + Express
- **Base de données** : PostgreSQL
- **IA** : Claude 3.5 Sonnet (Anthropic)
- **Email** : IMAP (node-imap)
- **Scheduler** : node-cron
- **Frontend** : HTML/CSS/JavaScript vanilla

## 📄 License

MIT

## 👨‍💻 Support

Pour toute question :
1. Vérifiez les logs
2. Consultez la documentation Anthropic : https://docs.anthropic.com
3. Documentation OVH Exchange : https://docs.ovh.com

---

**⚠️ Important** : Ce système supprime automatiquement des emails. Testez-le d'abord avec une boîte email de test avant de l'utiliser sur votre boîte principale !
