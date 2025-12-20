# Créer un compte administrateur

## ⚠️ Problème actuel

L'erreur 400 lors de la connexion admin signifie qu'aucun utilisateur n'existe dans Supabase.

## 📋 Solutions pour créer un admin

### Option 1 : Via la console Supabase (Recommandé)

1. **Accéder à la console Supabase**
   - Aller sur https://supabase.com
   - Se connecter avec votre compte
   - Sélectionner votre projet `qzfhcahxyxwiopxvndlw`

2. **Créer un utilisateur**
   - Aller dans `Authentication` > `Users`
   - Cliquer sur `Add user` ou `Create new user`
   - Entrer l'email : `admin@byvalsue.com` (ou autre)
   - Entrer un mot de passe fort
   - Décocher "Auto Confirm User" si vous voulez confirmer manuellement
   - Cliquer sur `Create user`

3. **Confirmer l'email (si nécessaire)**
   - Si l'utilisateur n'est pas auto-confirmé, allez dans la liste des users
   - Trouvez votre utilisateur
   - Cliquez sur les 3 points > `Confirm user`

4. **Tester la connexion**
   - Retourner sur https://eshopbyvalsue.mg/admin/login
   - Entrer l'email et le mot de passe
   - Vous devriez pouvoir vous connecter ! ✅

### Option 2 : Via le code (Page d'inscription temporaire)

Si vous préférez créer l'utilisateur via l'application, vous pouvez:

1. Créer temporairement une page d'inscription admin
2. L'utiliser pour créer le premier admin
3. La supprimer après

### Option 3 : Via SQL dans Supabase

1. Aller dans `SQL Editor` dans la console Supabase
2. Exécuter cette requête (remplacer email et password):

```sql
-- Créer un utilisateur dans auth.users
-- Note: Supabase hash automatiquement le password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@byvalsue.com',
  crypt('VotreMotDePasseIci', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

**⚠️ Important :** Cette méthode est plus complexe et peut ne pas fonctionner selon votre version de Supabase.

## 🔒 Sécurité

Pour l'instant, le code accepte tous les utilisateurs authentifiés comme admin (ligne 91 de AdminAuthContext.tsx).

**Recommandation:** Ajouter une vérification du rôle admin:

1. Ajouter un champ `role` dans la table `profiles` ou dans `user_metadata`
2. Vérifier ce rôle lors de la connexion
3. Rejeter les utilisateurs qui ne sont pas admin

## ✅ Vérifier que l'authentification est activée

Dans la console Supabase:
1. Aller dans `Authentication` > `Providers`
2. Vérifier que `Email` est activé
3. Vérifier les paramètres:
   - Confirm email: Peut être désactivé pour les tests
   - Secure email change: Activé
   - Secure password change: Activé

## 🎯 Prochaines étapes

1. Créer un utilisateur admin via la console Supabase (Option 1)
2. Tester la connexion sur https://eshopbyvalsue.mg/admin/login
3. Une fois connecté, ajouter une gestion des rôles pour sécuriser l'accès
