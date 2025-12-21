import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DatabaseBlogPost } from '../types';
import { markdownToHtml } from '../utils/markdown';
import { SEO } from '../components/seo/SEO';

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<DatabaseBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPost(id);
    }
  }, [id]);

  const loadPost = async (postId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .eq('is_published', true)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Article non trouvé');
        } else {
          throw fetchError;
        }
        return;
      }

      if (!data) {
        setError('Article non trouvé');
        return;
      }

      setPost(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement de l\'article:', error);
      setError('Erreur lors du chargement de l\'article');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-secondary" size={48} />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-heading font-bold text-text-dark mb-4">
            {error || 'Article non trouvé'}
          </h1>
          <p className="text-text-dark/60 mb-8">
            L'article que vous recherchez n'existe pas ou n'est pas disponible.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-colors"
          >
            <ArrowLeft size={20} />
            Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  const articleImage = post.image || '';
  const articleDescription = post.excerpt || post.title;
  const publishedDate = post.published_at || post.created_at;

  return (
    <>
      <SEO
        title={post.title}
        description={articleDescription}
        keywords={post.tags?.join(', ') || post.category || 'mode féminine, blog'}
        image={articleImage}
        url={`/blog/${post.id}`}
        type="article"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: articleDescription,
          image: articleImage,
          datePublished: publishedDate,
          dateModified: post.updated_at || publishedDate,
          author: {
            '@type': 'Person',
            name: post.author || 'ByValsue Team',
          },
          publisher: {
            '@type': 'Organization',
            name: 'ByValsue',
            logo: {
              '@type': 'ImageObject',
              url: 'https://eshopbyvalsue.mg/logo.png',
            },
          },
        }}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
      <div className="mb-6 text-sm text-text-dark/80">
        <Link to="/" className="hover:text-secondary transition-colors">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/blog" className="hover:text-secondary transition-colors">
          Blog
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text-dark font-medium">{post.title}</span>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-text-dark/80 hover:text-secondary transition-colors"
      >
        <ArrowLeft size={20} />
        Retour
      </button>

      <article className="max-w-4xl mx-auto">
        {/* Image principale */}
        {post.image && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* En-tête de l'article */}
        <header className="mb-8">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
              {post.category || 'Général'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-dark mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-6 text-text-dark/60">
            <div className="flex items-center gap-2">
              <User size={18} />
              <span>{post.author || 'ByValsue Team'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>
                {new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Extrait */}
        {post.excerpt && (
          <div className="mb-8 p-6 bg-neutral-light rounded-lg">
            <p className="text-lg text-text-dark/80 italic">{post.excerpt}</p>
          </div>
        )}

        {/* Contenu */}
        <div
          className="prose prose-lg max-w-none text-text-dark/80"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t border-neutral-support">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-neutral-light text-text-dark/60 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
    </>
  );
}

