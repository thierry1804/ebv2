export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // en Ariary
  images: string[]; // URLs Unsplash
  sizes: string[];
  colors: string[];
  description: string;
  composition: string;
  stock: number;
  rating: number; // 3.5-5
  reviewCount: number;
  isNew?: boolean;
  isOnSale?: boolean;
  salePrice?: number;
  brand?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  size: string | null;
  color: string | null;
  quantity: number;
  price: number; // Prix au moment de l'ajout
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  addresses?: Address[];
}

export interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  shippingAddress: Address;
  paymentMethod: 'mobile_money' | 'cash_on_delivery';
  subtotal: number;
  shipping: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  orderNumber: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  publishedAt: string;
  category: string;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

// Types pour le backoffice
export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
  lastLogin?: string;
}

export interface SiteContent {
  id: string;
  key: string;
  title: string;
  content: string;
  type: 'text' | 'html' | 'json';
  updatedAt: string;
  updatedBy: string;
}

export interface DatabaseBlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  published_at: string;
  category: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Types pour les configurations de la landing page
export interface LandingPageConfig {
  id: string;
  section_key: string;
  section_name: string;
  config_data: any; // JSONB data
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  buttonText: string;
  isActive: boolean;
}

export interface HeroSliderConfig {
  slides: HeroSlide[];
  autoplay: boolean;
  autoplayInterval: number;
}

export interface HeaderLogoConfig {
  text: string;
  imageUrl: string | null;
  link: string;
}

export interface PromotionalBannerConfig {
  text: string;
  isVisible: boolean;
}

export interface SectionConfig {
  title: string;
  seeAllLink?: string;
  seeAllText?: string;
  isVisible: boolean;
}

export interface InstagramConfig {
  title: string;
  isVisible: boolean;
  posts: Array<{
    image: string;
    link: string;
  }>;
}

export interface NewsletterConfig {
  title: string;
  description: string;
  placeholder: string;
  buttonText: string;
  isVisible: boolean;
}

