import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const BOOKINGS_URL = 'https://functions.poehali.dev/1c87f267-5e77-414e-8812-eec899d49002';

interface Booking {
  id: number;
  name: string;
  phone: string;
  booking_date: string;
  start_time: string;
  duration: number;
  balls: boolean;
  rackets_count: number;
  rackets_age: string;
  trainer: boolean;
  total_price: number;
  status: string;
  created_at: string;
  door_code: string | null;
}

function formatPhoneDisplay(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  let r = '+7';
  if (d.length > 1) r += ' (' + d.slice(1, 4);
  if (d.length >= 4) r += ') ' + d.slice(4, 7);
  if (d.length >= 7) r += '-' + d.slice(7, 9);
  if (d.length >= 9) r += '-' + d.slice(9, 11);
  return r;
}

export default function AccountModal({ onClose, savedPhone = '', savedName = '' }: { onClose: () => void; savedPhone?: string; savedName?: string }) {
  const [phone, setPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState(savedPhone);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [visibleCodes, setVisibleCodes] = useState<Set<number>>(new Set());

  const doSearch = async (digits: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BOOKINGS_URL}?phone=${digits}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setPhone(digits);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Автозагрузка если есть сохранённый номер
  useEffect(() => {
    if (savedPhone && savedPhone.length >= 10) {
      doSearch(savedPhone);
    }
  }, []);

  const searchBookings = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 10) { setError('Введите корректный номер телефона'); return; }
    doSearch(digits);
  };

  const cancelBooking = async (id: number) => {
    setCancellingId(id);
    try {
      const res = await fetch(BOOKINGS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      } else {
        alert(data.message || 'Ошибка отмены');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const totalHours = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.duration, 0);

  const statusLabel: Record<string, string> = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
  };
  const statusColor: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50',
    confirmed: 'text-green-700 bg-green-50',
    cancelled: 'text-gray-400 bg-gray-100',
  };

  const canCancel = (b: Booking) => {
    if (b.status === 'cancelled') return false;
    const dt = new Date(`${b.booking_date}T${b.start_time}`);
    return (dt.getTime() - Date.now()) > 60 * 60 * 1000;
  };

  const upcoming = bookings.filter(b => {
    const dt = new Date(`${b.booking_date}T${b.start_time}`);
    return dt > new Date() && b.status !== 'cancelled';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Icon name="X" size={18} className="text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#d8f3dc] rounded-xl flex items-center justify-center">
            <Icon name="User" size={20} className="text-[#2d6a4f]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Личный кабинет</h2>
        </div>

        {!loaded ? (
          <div>
            <p className="text-gray-600 text-sm mb-4">Введите номер телефона, чтобы найти свои брони</p>
            <input
              type="tel"
              value={formatPhoneDisplay(phoneInput)}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                setPhoneInput(raw.startsWith('8') || raw.startsWith('7') ? raw : '7' + raw);
              }}
              placeholder="+7 (___) ___-__-__"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 text-gray-900 focus:outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f]"
            />
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <button
              onClick={searchBookings}
              disabled={loading}
              className="w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Ищем...' : 'Найти брони'}
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              {savedName && <p className="font-bold text-gray-900 text-lg mb-1">{savedName}</p>}
              <p className="text-sm text-gray-500">Номер телефона</p>
              <p className="font-semibold text-gray-800">{formatPhoneDisplay(phone)}</p>
              {totalHours > 0 && (
                <p className="text-sm text-[#2d6a4f] mt-1">Сыграно часов: <strong>{totalHours}</strong></p>
              )}
              <p className="text-xs text-gray-400 mt-2">По вашему номеру могут позвонить для уточнения подробностей</p>
            </div>

            {bookings.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Бронирований не найдено</p>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-sm text-gray-500">{b.start_time.slice(0, 5)} · {b.duration} ч · {b.total_price} ₽</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[b.status] || 'text-gray-500 bg-gray-100'}`}>
                        {statusLabel[b.status] || b.status}
                      </span>
                    </div>
                    {(b.balls || b.rackets_count > 0 || b.trainer) && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {b.balls && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Мячи</span>}
                        {b.rackets_count > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Ракетка ×{b.rackets_count} ({b.rackets_age})</span>}
                        {b.trainer && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Тренер</span>}
                      </div>
                    )}
                    {b.status === 'confirmed' && b.door_code && (
                      <div className="bg-[#d8f3dc] border border-[#95d5b2] rounded-lg p-2 mb-2">
                        <p className="text-xs text-[#1b4332] font-semibold mb-1">Пароль от корта</p>
                        <button
                          onClick={() => setVisibleCodes(prev => {
                            const next = new Set(prev);
                            if (next.has(b.id)) { next.delete(b.id); } else { next.add(b.id); }
                            return next;
                          })}
                          className="flex items-center gap-2 w-full"
                        >
                          <span className={`text-xl font-bold text-[#2d6a4f] tracking-widest ${!visibleCodes.has(b.id) ? 'blur-sm select-none' : ''}`}>
                            {b.door_code}
                          </span>
                          <Icon name={visibleCodes.has(b.id) ? 'EyeOff' : 'Eye'} size={14} className="text-[#2d6a4f] shrink-0" />
                        </button>
                      </div>
                    )}
                    {b.status !== 'cancelled' && b.status !== 'confirmed' && (
                      <div className="bg-amber-50 rounded-lg p-2 mb-2">
                        <p className="text-xs text-amber-700">
                          Оплатите <strong>{b.total_price} ₽</strong> по номеру{' '}
                          <strong>8 930 278 29 29</strong> (Арсений, Т-Банк) за 1 час до начала
                        </p>
                      </div>
                    )}
                    {b.status === 'confirmed' && (
                      <div className="bg-gray-50 rounded-lg p-2 mb-2">
                        <p className="text-xs text-gray-500">
                          Оплата: <strong>{b.total_price} ₽</strong> на 8 930 278 29 29 (Арсений, Т-Банк) за 1 час до начала
                        </p>
                      </div>
                    )}
                    {canCancel(b) && (
                      <button
                        onClick={() => cancelBooking(b.id)}
                        disabled={cancellingId === b.id}
                        className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {cancellingId === b.id ? 'Отменяем...' : 'Отменить бронь'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setLoaded(false); setPhoneInput(''); setPhone(''); setBookings([]); }}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Искать другой номер
            </button>
          </div>
        )}
      </div>
    </div>
  );
}