import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';

const blogPosts = [
  {
    id: '1',
    title: 'Les tendances mode printemps-été 2024',
    excerpt: 'Découvrez les dernières tendances mode pour cette saison.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    author: 'ByValsue Team',
    publishedAt: '2024-01-15',
    category: 'Tendances',
  },
  {
    id: '2',
    title: 'Comment choisir la bonne taille ?',
    excerpt: 'Guide complet pour trouver la taille parfaite.',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    author: 'ByValsue Team',
    publishedAt: '2024-01-10',
    category: 'Conseils',
  },
  {
    id: '3',
    title: 'Entretien de vos vêtements en soie',
    excerpt: 'Conseils pour préserver la beauté de vos vêtements en soie.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    author: 'ByValsue Team',
    publishedAt: '2024-01-05',
    category: 'Conseils',
  },
];

export default function Blog() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Blog</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Articles */}
        <div className="lg:col-span-2">
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
                  to="/blog?category=tendances"
                  className="text-text-dark/80 hover:text-secondary transition-colors"
                >
                  Tendances
                </Link>
              </li>
              <li>
                <Link
                  to="/blog?category=conseils"
                  className="text-text-dark/80 hover:text-secondary transition-colors"
                >
                  Conseils
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

