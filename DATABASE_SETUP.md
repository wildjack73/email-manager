# Configuration PostgreSQL avec Railway - Guide Express

## Pourquoi Railway ?
- ✅ **Gratuit** : $5 de crédit offert/mois
- ✅ **2 minutes** de setup vs 30 min pour PostgreSQL local
- ✅ **Aucune installation** Windows nécessaire
- ✅ **Hébergement inclus** - votre app sera en ligne !

## Étapes (5 minutes chrono)

### 1. Créer un compte Railway
1. Allez sur https://railway.app
2. Cliquez "Start a New Project"
3. Connectez-vous avec GitHub (ou email)

### 2. Créer la base de données
1. Dans Railway, cliquez "New Project" 
2. Sélectionnez "Provision PostgreSQL"
3. Railway crée automatiquement une base de données

### 3. Obtenir le DATABASE_URL
1. Cliquez sur votre base PostgreSQL
2. Allez dans l'onglet "Variables"
3. Copiez la valeur de `DATABASE_URL`
   - Elle ressemble à : `postgresql://postgres:XXX@containers-us-west-XXX.railway.app:7432/railway`

### 4. Mettre à jour votre .env
Remplacez la ligne `DATABASE_URL` dans votre fichier `.env` par celle de Railway :

```env
DATABASE_URL=postgresql://postgres:XXX@containers-us-west-XXX.railway.app:7432/railway
```

### 5. Démarrer votre serveur local
```bash
cd backend
npm start
```

Votre serveur local utilisera la base Railway (pas besoin d'installer PostgreSQL) !

---

## Alternative : Installer PostgreSQL localement (30 min)

Si vous préférez vraiment PostgreSQL en local :

1. **Télécharger** : https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. **Installer** : Choisir PostgreSQL 15 ou 16 pour Windows
3. **Noter le mot de passe** que vous choisissez pendant l'installation
4. **Créer la base** :
   ```bash
   # Ouvrir "SQL Shell (psql)" depuis le menu Windows
   # Appuyer Enter pour toutes les questions sauf le password
   CREATE DATABASE email_manager;
   \q
   ```
5. **Dans .env** :
   ```env
   DATABASE_URL=postgresql://postgres:VOTRE_PASSWORD@localhost:5432/email_manager
   ```

---

## ⚡ Recommandation

**Utilisez Railway** - c'est plus rapide et votre app sera déjà hébergée en ligne !

Dites-moi quelle option vous choisissez et je vous aide pour la suite ! 🚀
