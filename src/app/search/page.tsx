'use client';

import React, { useState } from 'react';
import { getUserData } from '../../lib/userState';
import { useRouter } from 'next/navigation';
import BottomNavigation from '@/components/male/BottomNavigation';
import Navbar from '@/components/Navbar';
import exploreData from '@/app/data/Explore.json';

export default function Search() {
  const userData = getUserData();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);

  // Redirect if no user data
  React.useEffect(() => {
    if (!userData) {
      router.push('/');
    }
  }, [userData, router]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const tokens = searchQuery
        .toLowerCase()
        .split(/[\,\s]+/)
        .filter(Boolean);

      const userGender = (userData?.gender || '').toLowerCase();
      const mappedGender = userGender === 'female' ? 'women' : userGender === 'male' ? 'men' : userGender;

      const filtered = (exploreData as any[])
        .filter((item) => {
          const itemType = String(item.type || '').toLowerCase();
          // If we have a mapped gender, try to match; otherwise don't filter by gender
          if (mappedGender && itemType && itemType !== mappedGender) return false;
          const hay = `${String(item.title || '')} ${String(item.keyword || '')}`.toLowerCase();
          return tokens.every((t) => hay.includes(t));
        });

      // If nothing found and we filtered by gender, try again without gender restriction
      const results = filtered.length > 0 || !mappedGender
        ? filtered
        : (exploreData as any[]).filter((item) => {
            const hay = `${String(item.title || '')} ${String(item.keyword || '')}`.toLowerCase();
            return tokens.every((t) => hay.includes(t));
          });

      setProducts(results.slice(0, 48));
      setShowAll(false);
      setDisplayCount(12);
    } catch (error) {
      console.error('Local search error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1414] text-white p-8 pb-20">
      {/* Navbar for mobile */}
      <Navbar 
        items={[
          { icon: <span>🏠</span>, label: "Home", onClick: () => router.push(`/${userData.gender}`) },
          { icon: <span>🔍</span>, label: "Search", onClick: () => router.push('/search') },
          { icon: <span>💇</span>, label: "Hairstyle", onClick: () => userData.face_shape ? router.push('/hairstyle') : null },
          { icon: <span>⚙️</span>, label: "Dashboard", onClick: () => router.push('/dashboard') },
        ]}
      />
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Product Search</h1>
          <p className="text-gray-300">Find the perfect fashion items for your style</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for fashion items..."
              className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Products Grid - Themed like ExploreProducts */}
        {products.length > 0 && (
          <section className="py-2 bg-transparent">
            <div className="px-0 sm:px-0 lg:px-0">
              {/* Count header */}
              <div className="mb-6 text-center">
                <p className="text-gray-300">
                  Showing <span className="text-blue-400 font-semibold">{Math.min(displayCount, products.length)}</span> of <span className="text-blue-400 font-semibold">{products.length}</span> products
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.slice(0, displayCount).map((product: any, index: number) => (
                  <SearchProductCard key={`${product.asin || index}-${index}`} product={product} />
                ))}
              </div>

              <div className="text-center mt-8">
                {!showAll ? (
                  <button
                    onClick={() => { setShowAll(true); setDisplayCount(products.length); }}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    View All Products ({products.length})
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowAll(false); setDisplayCount(12); }}
                    className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                  >
                    Show Less
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* No Results */}
        {!loading && products.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-gray-300">Try adjusting your search terms</p>
          </div>
        )}

        {/* Initial State */}
        {!loading && products.length === 0 && !searchQuery && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold mb-2">Ready to discover fashion?</h3>
            <p className="text-gray-300">Search for your favorite styles and get personalized recommendations</p>
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
}

const SearchProductCard = ({ product }: { product: any }) => {
  return (
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer group bg-white relative text-gray-900 overflow-hidden rounded-2xl p-1 shadow-lg hover:shadow-xl transition-all hover:scale-105 duration-200 flex flex-col h-full"
    >
      <div className="absolute w-full h-full left-0 z-10">
        <div className="w-full h-1/2"></div>
        <div className="w-full h-1/2 bg-gradient-to-b from-transparent to-black"></div>
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-[374px] object-contain rounded-lg transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/placeholder-product.jpg';
          }}
        />
      </div>
      <div className="absolute z-10 px-3 bottom-0 left-0 right-0 flex flex-col justify-end">
        <h3 className="font-extrabold text-white border-b-2 line-clamp-2 min-h-[1rem] mb-2 text-sm">{product.title}</h3>
        <div className="flex justify-between items-center">
          <p className="text-white font-bold text-lg mb-3">{product.price}</p>
          <span className="text-white rounded-lg py-2 font-medium transition-colors text-sm">View on Amazon</span>
        </div>
      </div>
    </a>
  );
};
