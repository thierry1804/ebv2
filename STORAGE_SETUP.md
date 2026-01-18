# Configuration Supabase Storage pour l'upload d'images

Pour permettre l'upload d'images des catégories et des produits, vous devez configurer des buckets dans Supabase Storage.

## 📦 Créer le bucket "categories"

1. Allez dans votre projet Supabase
2. Naviguez vers **Storage** dans le menu de gauche
3. Cliquez sur **New bucket**
4. Configurez le bucket :
   - **Name**: `categories`
   - **Public bucket**: ✅ Cochez cette option (pour que les images soient accessibles publiquement)
   - **File size limit**: 5 MB (ou plus selon vos besoins)
   - **Allowed MIME types**: `image/*` (ou laissez vide pour autoriser tous les types)

5. Cliquez sur **Create bucket**

## 📦 Créer le bucket "products"

1. Cliquez sur **New bucket** à nouveau
2. Configurez le bucket :
   - **Name**: `products`
   - **Public bucket**: ✅ Cochez cette option
   - **File size limit**: 5 MB (ou plus selon vos besoins)
   - **Allowed MIME types**: `image/*` (ou laissez vide pour autoriser tous les types)

3. Cliquez sur **Create bucket**

## 🔐 Configurer les politiques de sécurité

Pour que les utilisateurs authentifiés puissent uploader des images, vous devez créer des politiques RLS pour chaque bucket :

### Pour le bucket "categories"

1. Allez dans **Storage** > **Policies**
2. Sélectionnez le bucket `categories`
3. Créez les politiques suivantes :

```sql
-- Politique pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload category images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'categories');

-- Politique pour permettre la lecture publique
CREATE POLICY "Public can read category images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'categories');
```

### Pour le bucket "products"

1. Sélectionnez le bucket `products`
2. Créez les politiques suivantes :

```sql
-- Politique pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Politique pour permettre la lecture publique
CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');
```

Ou utilisez l'interface graphique de Supabase pour créer ces politiques.

## ✅ Vérification

Une fois configuré, vous devriez pouvoir :
- Uploader des images depuis l'interface d'administration des catégories (bucket `categories`)
- Uploader des images depuis l'interface d'administration des produits (bucket `products`)
- Voir les images uploadées dans les buckets correspondants dans Supabase Storage
- Accéder aux images via leur URL publique

## 🔧 Alternative : Utiliser uniquement les URLs

Si vous ne souhaitez pas configurer Supabase Storage, vous pouvez toujours utiliser des URLs d'images externes (comme Unsplash) en les saisissant directement dans les champs URL ou en les ajoutant via le bouton "Ajouter" pour les produits.

