import { useState, useEffect } from 'react';
import BookingModal from '@/components/BookingModal';
import AccountModal from '@/components/AccountModal';
import ReviewModal from '@/components/ReviewModal';
import AdminModal from '@/components/AdminModal';
import ReviewsList from '@/components/ReviewsList';
import Icon from '@/components/ui/icon';

const COURT_IMG = 'https://cdn.poehali.dev/projects/3307ddc1-c587-4adf-8b5b-08ca10b655d2/files/e5d4655d-8901-4b6a-a1e2-f6dc98624519.jpg';

export default function Index() {
  const [modal, setModal] = useState<'booking' | 'account' | 'review' | 'admin' | null>(null);
  const [courtImage, setCourtImage] = useState(COURT_IMG);
  const savedPhone = localStorage.getItem('tennis_phone') || '';
  const savedName = localStorage.getItem('tennis_name') || '';

  useEffect(() => {
    fetch('https://functions.poehali.dev/0043f98f-94ed-4fe0-aaa1-d7b96efb3382', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'admin_ok' },
      body: JSON.stringify({ action: 'get_settings' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.settings?.court_image) setCourtImage(d.settings.court_image);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-golos">
      <div
        className="relative h-[70vh] min-h-[500px] bg-cover bg-center flex flex-col"
        style={{ backgroundImage: `url(${courtImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

        <div className="relative z-10 flex flex-col h-full">
          <header className="flex items-center justify-between px-6 py-5">
            <div className="text-white font-bold text-xl tracking-tight">
              Tennis Court
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModal('account')}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm text-gray-800 border border-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-white transition-all shadow-md"
              >
                <Icon name="User" size={16} />
                Личный кабинет
              </button>
              <button
                onClick={() => setModal('review')}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm text-gray-800 border border-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-white transition-all shadow-md"
              >
                <Icon name="MessageSquare" size={16} />
                Оставить отзыв
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
            <h1 className="text-white text-4xl md:text-6xl font-bold text-center mb-3 leading-tight tracking-tight">
              Теннисный корт
            </h1>
            <p className="text-white/80 text-lg text-center mb-10">
              Богородский район, д. Бурцево, Вишнёвый переулок 17Б
            </p>
            <button
              onClick={() => setModal('booking')}
              className="group relative bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-bold text-xl px-12 py-5 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center gap-3">
                <Icon name="Calendar" size={26} />
                Забронировать корт
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-[#d8f3dc] rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="Clock" size={22} className="text-[#2d6a4f]" />
            </div>
            <div className="font-bold text-gray-900 text-lg">7:00 — 00:00</div>
            <div className="text-gray-500 text-sm mt-1">Режим работы</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-[#d8f3dc] rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="Banknote" size={22} className="text-[#2d6a4f]" />
            </div>
            <div className="font-bold text-gray-900 text-lg">1 300 ₽/час</div>
            <div className="text-gray-500 text-sm mt-1">Аренда корта</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-[#d8f3dc] rounded-xl flex items-center justify-center mx-auto mb-3">
              <Icon name="MapPin" size={22} className="text-[#2d6a4f]" />
            </div>
            <div className="font-bold text-gray-900 text-lg">Бурцево</div>
            <div className="text-gray-500 text-sm mt-1">Богородский район</div>
          </div>
        </div>

        <ReviewsList />

        <div className="mt-8 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
            <Icon name="MapPin" size={18} className="text-[#2d6a4f]" />
            <span className="font-semibold text-gray-800 text-sm">Нижегородская область, Богородский округ, д. Бурцево, Вишнёвый переулок 17Б</span>
          </div>
          <iframe
            src="https://yandex.ru/map-widget/v1/?ll=43.723578%2C56.138430&z=16&l=map&pt=43.723578%2C56.138430%2Cpm2rdm"
            width="100%"
            height="320"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            title="Карта"
          />
          <a
            href="https://yandex.ru/maps/?pt=43.723578,56.138430&z=16&l=map"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-t border-gray-100 text-[#2d6a4f] text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Icon name="Navigation" size={15} />
            Мы находимся здесь — открыть в Яндекс Картах
          </a>
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-white py-8 px-6 text-center">
        <p className="text-gray-500 text-sm">
          Есть вопросы? Звоните:{' '}
          <a href="tel:89302782929" className="text-[#2d6a4f] font-semibold hover:underline">
            8 930 278 29 29
          </a>
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Нижегородская область, Богородский округ, д. Бурцево, Вишнёвый переулок 17Б
        </p>
        <button
          onClick={() => setModal('admin')}
          className="mt-6 text-gray-300 text-xs hover:text-gray-400 transition-colors"
        >
          Войти в админку
        </button>
      </footer>

      {modal === 'booking' && <BookingModal onClose={() => setModal(null)} />}
      {modal === 'account' && <AccountModal onClose={() => setModal(null)} savedPhone={savedPhone} savedName={savedName} />}
      {modal === 'review' && <ReviewModal onClose={() => setModal(null)} />}
      {modal === 'admin' && <AdminModal onClose={() => setModal(null)} />}
    </div>
  );
}