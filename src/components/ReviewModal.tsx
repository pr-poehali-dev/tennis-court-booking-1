import { useState } from 'react';
import Icon from '@/components/ui/icon';

const REVIEWS_URL = 'https://functions.poehali.dev/6447ee4a-57b3-410c-9e0e-460bd74e5ea0';

export default function ReviewModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (name.trim().length < 2) { setError('Введите ваше имя'); return; }
    if (text.trim().length < 10) { setError('Напишите отзыв (минимум 10 символов)'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(REVIEWS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim() }),
      });
      const data = await res.json();
      if (data.success) setSuccess(true);
      else setError('Ошибка при отправке');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Icon name="X" size={18} className="text-gray-500" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-[#d8f3dc] rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="CheckCircle" size={28} className="text-[#2d6a4f]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Спасибо за отзыв!</h2>
            <p className="text-gray-500 text-sm mb-6">Ваш отзыв опубликован</p>
            <button onClick={onClose} className="bg-[#2d6a4f] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#1b4332] transition-colors">
              Закрыть
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Оставить отзыв</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ваше имя</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Оценка</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className="text-2xl transition-transform hover:scale-110"
                  >
                    {s <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Отзыв</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Расскажите о вашем опыте..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f] resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Отправляем...' : 'Опубликовать отзыв'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}