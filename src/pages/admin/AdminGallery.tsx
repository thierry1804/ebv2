import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Trash2, Upload, X, Image as ImageIcon, Loader2, Grid, List,
  FolderPlus, Folder, FolderOpen, ChevronLeft, Edit, Check, MoveRight,
  Package,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Offcanvas } from '../../components/ui/Offcanvas';
import toast from 'react-hot-toast';
import { convertToWebP } from '../../utils/imageUtils';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { formatAppError } from '../../utils/errors';
import { PageLoading } from '../../components/ui/PageLoading';
import {
  isImageApiConfigured,
  uploadImageToImageApi,
  deleteImageFromImageApi,
  isImageApiUrl,
  normalizeImageApiUrl,
} from '../../lib/imageApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GalleryFolder {
  id: string;
  name: string;
  created_at: string;
}

interface GalleryImage {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  original_filename: string | null;
  folder_id: string | null;
  display_order: number;
  created_at: string;
}

type ViewMode = 'grid' | 'list';

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export default function AdminGallery() {
  const confirm = useConfirm();
  const { adminUser } = useAdminAuth();

  // Données
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation dossiers
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Upload
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vue
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /** IDs dont le fichier image n’existe pas / ne charge pas (masquées dans la grille) */
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());

  // Dossier — création / renommage
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderInputValue, setFolderInputValue] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // Déplacer vers dossier
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  // Suppression en masse
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  /* ---------------------------------------------------------------- */
  /*  Chargement                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadFolders(), loadImages()]);
    setIsLoading(false);
  };

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_folders')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.warn('Table gallery_folders:', error);
        setFolders([]);
      } else {
        setFolders(data || []);
      }
    } catch (error: unknown) {
      console.error('Erreur chargement dossiers:', error);
    }
  };

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Table gallery:', error);
        setImages([]);
      } else {
        setBrokenImageIds(new Set());
        setImages(
          (data || []).map((img: GalleryImage) => ({
            ...img,
            image_url: normalizeImageApiUrl(img.image_url),
          }))
        );
      }
    } catch (error: unknown) {
      console.error('Erreur chargement galerie:', error);
      toast.error(formatAppError(error, 'Erreur chargement galerie'));
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Images filtrées par dossier courant                              */
  /* ---------------------------------------------------------------- */

  const filteredImages = useMemo(
    () => images.filter((img) => img.folder_id === currentFolderId),
    [images, currentFolderId]
  );

  const displayedGalleryImages = useMemo(
    () => filteredImages.filter((img) => !brokenImageIds.has(img.id)),
    [filteredImages, brokenImageIds]
  );

  const handleGalleryImageError = (id: string) => {
    setBrokenImageIds((prev) => new Set(prev).add(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const currentFolder = useMemo(
    () => folders.find((f) => f.id === currentFolderId) ?? null,
    [folders, currentFolderId]
  );

  /* ---------------------------------------------------------------- */
  /*  Sélection                                                        */
  /* ---------------------------------------------------------------- */

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedGalleryImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedGalleryImages.map((img) => img.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowMoveMenu(false);
  };

  /* ---------------------------------------------------------------- */
  /*  Actions en masse                                                 */
  /* ---------------------------------------------------------------- */

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: 'Supprimer les photos sélectionnées',
      message: `${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''} seront supprimée${selectedIds.size > 1 ? 's' : ''} définitivement.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    const toDelete = images.filter((img) => selectedIds.has(img.id));
    let deleted = 0;

    setIsDeleting(true);
    setDeleteProgress({ current: 0, total: toDelete.length });

    for (let i = 0; i < toDelete.length; i++) {
      const img = toDelete[i];
      setDeleteProgress({ current: i + 1, total: toDelete.length });
      try {
        if (isImageApiUrl(img.image_url)) {
          await deleteImageFromImageApi(img.image_url);
        }
        const { error } = await supabase.from('gallery').delete().eq('id', img.id);
        if (!error) deleted++;
      } catch (err) {
        console.error(`Erreur suppression ${img.id}:`, err);
      }
    }

    setIsDeleting(false);
    setDeleteProgress({ current: 0, total: 0 });
    toast.success(`${deleted} photo${deleted > 1 ? 's' : ''} supprimée${deleted > 1 ? 's' : ''}`);
    clearSelection();
    await loadImages();
  };

  const handleBulkMove = async (targetFolderId: string | null) => {
    if (selectedIds.size === 0) return;
    try {
      const { error } = await supabase
        .from('gallery')
        .update({ folder_id: targetFolderId })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      const targetName = targetFolderId
        ? folders.find((f) => f.id === targetFolderId)?.name ?? 'dossier'
        : 'Racine';
      toast.success(`${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''} déplacée${selectedIds.size > 1 ? 's' : ''} vers "${targetName}"`);
      clearSelection();
      setShowMoveMenu(false);
      await loadImages();
    } catch (error: unknown) {
      toast.error(formatAppError(error, 'Erreur lors du déplacement'));
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Dossiers CRUD                                                    */
  /* ---------------------------------------------------------------- */

  const handleCreateFolder = async () => {
    const name = folderInputValue.trim();
    if (!name) return;

    try {
      const { error } = await supabase.from('gallery_folders').insert({ name });
      if (error) throw error;
      toast.success(`Dossier "${name}" créé`);
      setFolderInputValue('');
      setShowFolderInput(false);
      await loadFolders();
    } catch (error: unknown) {
      toast.error(formatAppError(error, 'Erreur création dossier'));
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    const name = renameFolderValue.trim();
    if (!name) return;

    try {
      const { error } = await supabase
        .from('gallery_folders')
        .update({ name })
        .eq('id', folderId);
      if (error) throw error;
      toast.success('Dossier renommé');
      setRenamingFolderId(null);
      setRenameFolderValue('');
      await loadFolders();
    } catch (error: unknown) {
      toast.error(formatAppError(error, 'Erreur renommage'));
    }
  };

  const handleDeleteFolder = async (folder: GalleryFolder) => {
    const folderImages = images.filter((img) => img.folder_id === folder.id);
    const ok = await confirm({
      title: 'Supprimer le dossier',
      message: folderImages.length > 0
        ? `Le dossier "${folder.name}" contient ${folderImages.length} photo${folderImages.length > 1 ? 's' : ''}. Les photos seront déplacées à la racine.`
        : `Supprimer le dossier "${folder.name}" ?`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      // Déplacer les images vers la racine
      if (folderImages.length > 0) {
        const { error: moveError } = await supabase
          .from('gallery')
          .update({ folder_id: null })
          .eq('folder_id', folder.id);
        if (moveError) throw moveError;
      }

      const { error } = await supabase.from('gallery_folders').delete().eq('id', folder.id);
      if (error) throw error;

      toast.success(`Dossier "${folder.name}" supprimé`);
      if (currentFolderId === folder.id) setCurrentFolderId(null);
      await Promise.all([loadFolders(), loadImages()]);
    } catch (error: unknown) {
      toast.error(formatAppError(error, 'Erreur suppression dossier'));
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const handleOpenUpload = () => {
    setFormData({ title: '', description: '' });
    setSelectedFiles([]);
    setFilePreviews([]);
    setUploadProgress({ current: 0, total: 0, fileName: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOffcanvasOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" n'est pas une image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" dépasse 5 Mo`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFilePreviews((prev) => [...prev, ...validFiles.map((f) => URL.createObjectURL(f))]);
  };

  const handleRemoveSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadSingleImage = async (file: File): Promise<string | null> => {
    const webpFile = await convertToWebP(file);
    if (isImageApiConfigured()) {
      const apiUrl = await uploadImageToImageApi(webpFile);
      if (apiUrl) return apiUrl;
    }
    throw new Error('Image API non configurée. Vérifiez VITE_IMAGE_API_BASE_URL et VITE_IMAGE_API_KEY.');
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Veuillez sélectionner au moins une image');
      return;
    }
    if (!adminUser) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length, fileName: '' });
    let successCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length, fileName: file.name });

        try {
          const imageUrl = await uploadSingleImage(file);
          if (!imageUrl) continue;

          const { error: insertError } = await supabase.from('gallery').insert({
            title: formData.title.trim() || null,
            description: formData.description.trim() || null,
            image_url: imageUrl,
            original_filename: file.name,
            folder_id: currentFolderId,
            display_order: filteredImages.length + successCount,
          });

          if (insertError) {
            console.error('Erreur insertion:', insertError);
            await deleteImageFromImageApi(imageUrl);
            continue;
          }
          successCount++;
        } catch (err) {
          console.error(`Erreur upload ${file.name}:`, err);
          toast.error(formatAppError(err, `Erreur upload "${file.name}"`));
        }
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'Image ajoutée à la galerie'
            : `${successCount} images ajoutées à la galerie`
        );
        setIsOffcanvasOpen(false);
        await loadImages();
      } else {
        toast.error("Aucune image n'a pu être uploadée");
      }
    } catch (error: unknown) {
      toast.error(formatAppError(error, "Erreur lors de l'upload"));
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Suppression unitaire                                             */
  /* ---------------------------------------------------------------- */

  const handleDelete = async (image: GalleryImage) => {
    const ok = await confirm({
      title: 'Supprimer la photo',
      message: 'Cette photo sera supprimée définitivement.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      if (isImageApiUrl(image.image_url)) await deleteImageFromImageApi(image.image_url);
      const { error } = await supabase.from('gallery').delete().eq('id', image.id);
      if (error) throw error;
      toast.success('Photo supprimée');
      await loadImages();
    } catch (error: unknown) {
      toast.error(formatAppError(error, 'Erreur suppression'));
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const imageCountInFolder = (folderId: string) =>
    images.filter((img) => img.folder_id === folderId).length;

  /* ---------------------------------------------------------------- */
  /*  Rendu                                                            */
  /* ---------------------------------------------------------------- */

  if (isLoading) return <PageLoading />;

  const hasSelection = selectedIds.size > 0;

  const handleCreateProductFromSelection = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(',');
    const url = `${window.location.origin}/admin/produits?fromGallery=${encodeURIComponent(ids)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      {/* ============= En-tête ============= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {currentFolderId && (
            <button
              onClick={() => { setCurrentFolderId(null); clearSelection(); }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Retour"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <h1 className="text-3xl font-heading font-bold text-text-dark">
            {currentFolder ? currentFolder.name : 'Galerie'}
          </h1>
          {displayedGalleryImages.length > 0 && (
            <span className="text-sm text-gray-500 mt-1">
              ({displayedGalleryImages.length} photo{displayedGalleryImages.length > 1 ? 's' : ''})
            </span>
          )}
        </div>

        <div className="scrollbar-thin flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto sm:overflow-visible">
          {(filteredImages.length > 0 || folders.length > 0) && (
            <div className="flex shrink-0 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-secondary' : 'text-gray-500 hover:text-gray-700'}`}
                title="Vignettes"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-secondary' : 'text-gray-500 hover:text-gray-700'}`}
                title="Liste"
              >
                <List size={18} />
              </button>
            </div>
          )}
          {!currentFolderId && (
            <button
              type="button"
              onClick={() => { setShowFolderInput(true); setFolderInputValue(''); }}
              aria-label="Nouveau dossier"
              title="Nouveau dossier"
              className="shrink-0 inline-flex items-center justify-center rounded-md bg-gray-200 p-2 text-gray-800 transition-colors hover:bg-gray-300"
            >
              <FolderPlus size={18} className="shrink-0" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenUpload}
            aria-label="Ajouter des photos"
            title="Ajouter des photos"
            className="shrink-0 inline-flex items-center justify-center rounded-md bg-secondary p-2 text-white shadow-sm transition-colors hover:bg-secondary/90"
          >
            <Plus size={18} className="shrink-0" aria-hidden />
          </button>
        </div>
      </div>

      {/* ============= Barre de sélection ============= */}
      {(hasSelection || isDeleting) && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg px-4 py-3 mb-4">
          {/* Progression de suppression */}
          {isDeleting ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Suppression {deleteProgress.current} / {deleteProgress.total}
                </span>
                <span className="text-sm text-red-600">
                  {Math.round((deleteProgress.current / deleteProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="scrollbar-thin flex min-w-0 flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto">
              <span className="min-w-0 shrink-0 text-sm font-medium text-secondary">
                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
                {/* Déplacer */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateProductFromSelection}
                  className="text-sm"
                >
                  <Package size={16} className="shrink-0" aria-hidden />
                  Créer un produit
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoveMenu(!showMoveMenu)}
                    aria-label="Déplacer vers un dossier"
                    title="Déplacer"
                    className="!gap-0 border-gray-300 bg-white px-2 text-gray-900 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <MoveRight size={18} className="shrink-0" aria-hidden />
                  </Button>
                  {showMoveMenu && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                      {currentFolderId && (
                        <button
                          onClick={() => handleBulkMove(null)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Folder size={16} className="text-gray-400" />
                          Racine (hors dossier)
                        </button>
                      )}
                      {folders
                        .filter((f) => f.id !== currentFolderId)
                        .map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => handleBulkMove(folder.id)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Folder size={16} className="text-yellow-500" />
                            {folder.name}
                          </button>
                        ))}
                      {folders.filter((f) => f.id !== currentFolderId).length === 0 && !currentFolderId && (
                        <p className="px-4 py-2 text-sm text-gray-400">Aucun dossier</p>
                      )}
                    </div>
                  )}
                </div>
                {/* Supprimer */}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleBulkDelete}
                  aria-label="Supprimer la sélection"
                  title="Supprimer"
                  className="!gap-0 bg-red-600 px-2 text-white hover:bg-red-700 hover:text-white focus-visible:outline-red-600 focus:ring-red-600"
                >
                  <Trash2 size={18} className="shrink-0" aria-hidden />
                </Button>
                {/* Annuler */}
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Annuler la sélection"
                  title="Annuler"
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============= Création dossier inline ============= */}
      {showFolderInput && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-3">
          <FolderPlus size={20} className="text-yellow-500 flex-shrink-0" />
          <input
            type="text"
            value={folderInputValue}
            onChange={(e) => setFolderInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowFolderInput(false); }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary text-sm"
            placeholder="Nom du dossier..."
            autoFocus
          />
          <Button onClick={handleCreateFolder} className="bg-secondary hover:bg-secondary/90 text-sm">
            <Check size={16} className="shrink-0" aria-hidden />
            Créer
          </Button>
          <button onClick={() => setShowFolderInput(false)} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
      )}

      {/* ============= Dossiers (uniquement à la racine) ============= */}
      {!currentFolderId && folders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-secondary/50 hover:shadow transition-all"
            >
              {renamingFolderId === folder.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameFolderValue}
                    onChange={(e) => setRenameFolderValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setRenamingFolderId(null); }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-secondary"
                    autoFocus
                  />
                  <button onClick={() => handleRenameFolder(folder.id)} className="p-1 text-green-600 hover:text-green-800">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setRenamingFolderId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div onClick={() => { setCurrentFolderId(folder.id); clearSelection(); }}>
                  <div className="flex items-center gap-3 mb-2">
                    <FolderOpen size={28} className="text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-dark truncate">{folder.name}</p>
                      <p className="text-xs text-gray-500">
                        {imageCountInFolder(folder.id)} photo{imageCountInFolder(folder.id) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {renamingFolderId !== folder.id && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); setRenameFolderValue(folder.name); }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Renommer"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Supprimer le dossier"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============= Sélectionner tout ============= */}
      {displayedGalleryImages.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            <input
              type="checkbox"
              checked={selectedIds.size === displayedGalleryImages.length && displayedGalleryImages.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            Tout sélectionner
          </label>
        </div>
      )}

      {/* ============= Images — vide ============= */}
      {filteredImages.length === 0 && (currentFolderId || folders.length === 0) ? (
        <div className="text-center py-16 text-gray-500">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Aucune photo {currentFolder ? `dans "${currentFolder.name}"` : 'dans la galerie'}</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter des photos" pour commencer</p>
        </div>
      ) : filteredImages.length > 0 && displayedGalleryImages.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Aucune photo affichable</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Les fichiers ne sont pas disponibles sur le serveur pour les entrées encore enregistrées. Rechargez après correction ou supprimez les lignes obsolètes en base.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ============= Vue vignettes ============= */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedGalleryImages.map((image) => {
            const isSelected = selectedIds.has(image.id);
            return (
              <div
                key={image.id}
                className={`group relative bg-white rounded-lg shadow-sm border-2 overflow-hidden transition-colors ${
                  isSelected ? 'border-secondary' : 'border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(image.id)}
                    className="w-5 h-5 rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer"
                  />
                </div>
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={image.image_url}
                    alt={image.title || 'Photo galerie'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={() => handleGalleryImageError(image.id)}
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                  {(image.title || image.original_filename) && (
                    <span className="text-white text-sm font-medium truncate mr-2">
                      {image.title || image.original_filename}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(image)}
                    className="flex-shrink-0 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============= Vue liste ============= */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === displayedGalleryImages.length && displayedGalleryImages.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedGalleryImages.map((image) => {
                const isSelected = selectedIds.has(image.id);
                return (
                  <tr key={image.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-secondary/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(image.id)}
                        className="rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={image.image_url}
                          alt={image.title || 'Photo galerie'}
                          className="w-full h-full object-cover"
                          onError={() => handleGalleryImageError(image.id)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-dark font-medium">
                        {image.title || image.original_filename || <span className="text-gray-400 italic">Sans titre</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {image.description || <span className="text-gray-400">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-500">{formatDate(image.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(image)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============= Offcanvas Upload ============= */}
      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => !isUploading && setIsOffcanvasOpen(false)}
        title={currentFolder ? `Ajouter dans "${currentFolder.name}"` : 'Ajouter des photos'}
        position="right"
        width="lg"
        footer={
          <div className="flex flex-nowrap items-center justify-end gap-3">
            <Button
              onClick={() => setIsOffcanvasOpen(false)}
              disabled={isUploading}
              className="shrink-0 bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="shrink-0 bg-secondary hover:bg-secondary/90 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="shrink-0 animate-spin" aria-hidden />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload size={18} className="shrink-0" aria-hidden />
                  Uploader {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Barre de progression */}
          {isUploading && uploadProgress.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  Upload {uploadProgress.current} / {uploadProgress.total}
                </span>
                <span className="text-sm text-blue-600">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 mt-2 truncate">{uploadProgress.fileName}</p>
            </div>
          )}

          {/* Sélection de fichiers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos à ajouter *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              id="gallery-upload"
            />
            <label
              htmlFor="gallery-upload"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg transition-colors ${
                isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-secondary hover:bg-gray-50'
              }`}
            >
              <Upload size={24} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">Cliquez ou glissez des images ici</span>
              <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 Mo par image</span>
            </label>
          </div>

          {/* Prévisualisation */}
          {filePreviews.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} sélectionnée{selectedFiles.length > 1 ? 's' : ''}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative group/preview">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className={`w-full aspect-square object-cover rounded-lg border border-gray-200 ${
                        isUploading && uploadProgress.current > index ? 'opacity-50' : ''
                      }`}
                    />
                    {isUploading && uploadProgress.current > index && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <div className="bg-green-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {isUploading && uploadProgress.current === index + 1 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    )}
                    {!isUploading && (
                      <button
                        onClick={() => handleRemoveSelectedFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover/preview:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre (optionnel)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isUploading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary disabled:opacity-50"
              placeholder="Ex: Collection été 2026"
            />
            <p className="text-xs text-gray-500 mt-1">Appliqué à toutes les images de ce lot</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isUploading}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary disabled:opacity-50"
              placeholder="Description des photos..."
            />
          </div>
        </div>
      </Offcanvas>
    </div>
  );
}
