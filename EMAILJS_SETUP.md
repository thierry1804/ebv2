# Configuration EmailJS pour le formulaire de contact

## Étapes de configuration

### 1. Créer un compte EmailJS
1. Allez sur [https://www.emailjs.com/](https://www.emailjs.com/)
2. Créez un compte gratuit (200 emails/mois)

### 2. Configurer un service email
1. Dans le dashboard EmailJS, allez dans **Email Services**
2. Cliquez sur **Add New Service**
3. Choisissez votre fournisseur d'email (Gmail, Outlook, etc.)
4. Suivez les instructions pour connecter votre compte email
5. Notez le **Service ID** (ex: `service_xxxxxxx`)

### 3. Créer un template d'email
1. Allez dans **Email Templates**
2. Cliquez sur **Create New Template**
3. Configurez le template avec les variables suivantes :
   - `{{from_name}}` - Nom de l'expéditeur
   - `{{from_email}}` - Email de l'expéditeur
   - `{{message}}` - Message
   - `{{to_email}}` - Email du destinataire (optionnel)
4. Exemple de template :
   ```
   Nouveau message de contact depuis le site web
   
   Nom: {{from_name}}
   Email: {{from_email}}
   
   Message:
   {{message}}
   ```
5. Notez le **Template ID** (ex: `template_xxxxxxx`)

### 4. Récupérer la clé publique
1. Allez dans **Account** > **General**
2. Copiez votre **Public Key** (ex: `xxxxxxxxxxxxx`)

### 5. Configurer les variables d'environnement
Créez un fichier `.env` à la racine du projet avec :

```env
VITE_EMAILJS_SERVICE_ID=votre_service_id
VITE_EMAILJS_TEMPLATE_ID=votre_template_id
VITE_EMAILJS_PUBLIC_KEY=votre_public_key
```

### 6. Redémarrer le serveur de développement
Après avoir ajouté les variables d'environnement, redémarrez le serveur :
```bash
npm run dev
```

## Test
Une fois configuré, testez le formulaire de contact sur la page `/contact`. Vous devriez recevoir un email à l'adresse configurée dans votre service EmailJS.

## Notes
- Le plan gratuit d'EmailJS permet 200 emails/mois
- Pour plus d'emails, vous devrez passer à un plan payant
- Les emails sont envoyés directement depuis le navigateur (pas de backend nécessaire)



