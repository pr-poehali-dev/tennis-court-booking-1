import { useEffect, useState } from 'react';

const REVIEWS_URL = 'https://functions.poehali.dev/6447ee4a-57b3-410c-9e0e-460bd74e5ea0';

interface Review {
  id: number;
  name: string;
  rating: number;
  text: string;
  created_at: string;
}

export default function ReviewsList() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(REVIEWS_URL)
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (reviews.length === 0) return (
    <div className="text-center py-10 text-gray-400">
      <p className="text-4xl mb-2">🎾</p>
      <p>Отзывов пока нет — будьте первым!</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Отзывы</h2>
      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800">{r.name}</p>
                <p className="text-sm text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-yellow-400 text-lg tracking-tight">
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
