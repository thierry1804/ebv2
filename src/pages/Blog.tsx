import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DatabaseBlogPost } from '../types';

interface BlogPostDisplay {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  publishedAt: string;
  category: string;
}

export default function Blog() {
  const [blogPosts, setBlogPosts] = useState<BlogPostDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');

  useEffect(() => {
    loadBlogPosts();
  }, [selectedCategory]);

  const loadBlogPosts = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });

      // Filtrer par catégorie si sélectionnée
      if (selectedCategory) {
        query = query.ilike('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des articles:', error);
        console.error('Détails de l\'erreur:', error.message, error.code);
        setBlogPosts([]);
        return;
      }

      console.log('Articles chargés:', data?.length || 0, 'articles');

      // Adapter les données de Supabase au format d'affichage
      const adaptedPosts: BlogPostDisplay[] = (data || []).map((post: DatabaseBlogPost) => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt || '',
        image: post.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        author: post.author || 'ByValsue Team',
        publishedAt: post.published_at || post.created_at,
        category: post.category || 'Général',
      }));

      setBlogPosts(adaptedPosts);

      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set((data || []).map((post: DatabaseBlogPost) => post.category).filter(Boolean))
      );
      setCategories(uniqueCategories);
    } catch (error: any) {
      console.error('Erreur lors du chargement des articles:', error);
      setBlogPosts([]);
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-secondary" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Blog</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Articles */}
        <div className="lg:col-span-2">
          {blogPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-dark/60 text-lg">Aucun article disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <span className="text-sm text-accent font-medium">{post.category}</span>
                  <h2 className="text-xl font-heading font-semibold text-text-dark mt-2 mb-3 hover:text-secondary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-text-dark/80 mb-4">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-text-dark/60">
                    <div className="flex items-center gap-1">
                      <User size={16} />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{new Date(post.publishedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-lg text-text-dark mb-4">
              Catégories
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/blog"
                  className={`text-text-dark/80 hover:text-secondary transition-colors ${
                    !selectedCategory ? 'text-secondary font-medium' : ''
                  }`}
                >
                  Toutes
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    to={`/blog?category=${encodeURIComponent(category.toLowerCase())}`}
                    className={`text-text-dark/80 hover:text-secondary transition-colors ${
                      selectedCategory?.toLowerCase() === category.toLowerCase()
                        ? 'text-secondary font-medium'
                        : ''
                    }`}
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

