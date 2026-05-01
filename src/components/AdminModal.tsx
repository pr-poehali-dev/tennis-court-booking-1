import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';

const ADMIN_URL = 'https://functions.poehali.dev/0043f98f-94ed-4fe0-aaa1-d7b96efb3382';

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
}

interface Block {
  id: number;
  block_date: string | null;
  block_time: string | null;
  block_end_time: string | null;
  block_type: string;
  reason: string | null;
}

const statusLabel: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  cancelled: 'Отменено',
};
const statusColor: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50',
  confirmed: 'text-green-700 bg-green-50',
  cancelled: 'text-gray-400 bg-gray-100',
};

export default function AdminModal({ onClose }: { onClose: () => void }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_authed') === '1');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<'bookings' | 'blocks' | 'reviews' | 'photo'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reviews, setReviews] = useState<{id: number; name: string; rating: number; text: string; created_at: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockType, setBlockType] = useState('time');
  const [blockReason, setBlockReason] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [doorCodeInput, setDoorCodeInput] = useState('');

  // Автозагрузка если уже авторизован на этом устройстве
  useEffect(() => {
    if (authed) loadData();
  }, []);

  const login = async () => {
    try {
      const res = await fetch(ADMIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_authed', '1');
        setAuthed(true);
        loadData();
      } else {
        setAuthError('Неверный пароль');
      }
    } catch {
      setAuthError('Ошибка соединения');
    }
  };

  const req = (body: object) =>
    fetch(ADMIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'admin_ok' },
      body: JSON.stringify(body),
    }).then(r => r.json());

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [bRes, blRes, rRes] = await Promise.all([
        req({ action: 'get_bookings' }),
        req({ action: 'get_blocks' }),
        req({ action: 'get_reviews' }),
      ]);
      setBookings(bRes.bookings || []);
      setBlocks(blRes.blocks || []);
      setReviews(rRes.reviews || []);
    } catch {
      setLoadError('Не удалось загрузить данные. Попробуйте обновить.');
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (id: number, doorCode: string) => {
    await req({ action: 'confirm_booking', id, door_code: doorCode });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
    setConfirmingId(null);
    setDoorCodeInput('');
  };

  const cancelBooking = async (id: number) => {
    await req({ action: 'cancel_booking', id });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  const deleteBooking = async (id: number) => {
    if (!confirm('Удалить бронь полностью?')) return;
    await req({ action: 'delete_booking', id });
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const deleteReview = async (id: number) => {
    if (!confirm('Удалить отзыв?')) return;
    await req({ action: 'delete_review', id });
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const addBlock = async () => {
    if (!blockDate) return;
    await req({ action: 'add_block', block_date: blockDate, block_time: blockTime || null, block_end_time: blockEndTime || null, block_type: blockType, reason: blockReason });
    setBlockDate(''); setBlockTime(''); setBlockEndTime(''); setBlockReason('');
    loadData();
  };

  const removeBlock = async (id: number) => {
    await req({ action: 'remove_block', id });
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await req({ action: 'upload_image', image_data: base64, image_type: file.type });
      if (res.url) setPhotoUrl(res.url);
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!authed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl mx-4">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg">
            <Icon name="X" size={18} className="text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Вход в админку</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Пароль"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 text-gray-900 focus:outline-none focus:border-[#2d6a4f]"
          />
          {authError && <p className="text-sm text-red-500 mb-3">{authError}</p>}
          <button
            onClick={login}
            className="w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Админ-панель</h2>
          <div className="flex items-center gap-2">
            <button onClick={loadData} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40" title="Обновить">
              <Icon name="RefreshCw" size={16} className="text-gray-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <Icon name="X" size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {(['bookings', 'blocks', 'reviews', 'photo'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${tab === t ? 'text-[#2d6a4f] border-b-2 border-[#2d6a4f]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'bookings' ? 'Брони' : t === 'blocks' ? 'Блокировки' : t === 'reviews' ? 'Отзывы' : 'Фото'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && <p className="text-center text-gray-400 py-8">Загружаем данные...</p>}
          {!loading && loadError && (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm mb-3">{loadError}</p>
              <button onClick={loadData} className="bg-[#2d6a4f] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1b4332] transition-colors">
                Повторить
              </button>
            </div>
          )}

          {!loading && tab === 'bookings' && (
            <div className="space-y-3">
              {bookings.length === 0 && <p className="text-center text-gray-400 py-8">Бронирований нет</p>}
              {bookings.map(b => (
                <div key={b.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{b.name}</p>
                      <p className="text-sm text-gray-500">{b.phone}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, {b.start_time?.slice(0, 5)} · {b.duration} ч · {b.total_price} ₽
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[b.status] || ''}`}>
                      {statusLabel[b.status] || b.status}
                    </span>
                  </div>
                  {(b.balls || b.rackets_count > 0 || b.trainer) && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {b.balls && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Мячи</span>}
                      {b.rackets_count > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Ракетка ×{b.rackets_count} ({b.rackets_age})</span>}
                      {b.trainer && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Тренер</span>}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {b.status !== 'cancelled' && b.status !== 'confirmed' && confirmingId !== b.id && (
                      <button
                        onClick={() => { setConfirmingId(b.id); setDoorCodeInput(''); }}
                        className="text-sm bg-[#d8f3dc] text-[#2d6a4f] font-medium px-3 py-1.5 rounded-lg hover:bg-[#b7e4c7] transition-colors"
                      >
                        Подтвердить
                      </button>
                    )}
                    {confirmingId === b.id && (
                      <div className="w-full mt-1 flex flex-col gap-2">
                        <input
                          type="text"
                          value={doorCodeInput}
                          onChange={e => setDoorCodeInput(e.target.value)}
                          placeholder="Код от двери корта"
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#2d6a4f]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmBooking(b.id, doorCodeInput)}
                            disabled={!doorCodeInput.trim()}
                            className="text-sm bg-[#2d6a4f] text-white font-medium px-3 py-1.5 rounded-lg hover:bg-[#1b4332] transition-colors disabled:opacity-40"
                          >
                            Подтвердить
                          </button>
                          <button
                            onClick={() => { setConfirmingId(null); setDoorCodeInput(''); }}
                            className="text-sm bg-gray-100 text-gray-600 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                    {b.status !== 'cancelled' && (
                      <button
                        onClick={() => cancelBooking(b.id)}
                        className="text-sm bg-red-50 text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Отменить
                      </button>
                    )}
                    <button
                      onClick={() => deleteBooking(b.id)}
                      className="text-sm bg-gray-100 text-gray-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors ml-auto"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'blocks' && (
            <div>
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="font-semibold text-gray-800 mb-3">Добавить блокировку</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Тип</label>
                    <div className="flex gap-2">
                      {[{ v: 'day', l: 'Весь день' }, { v: 'time', l: 'Время корта' }, { v: 'trainer', l: 'Тренер' }].map(opt => (
                        <button
                          key={opt.v}
                          onClick={() => setBlockType(opt.v)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                            ${blockType === opt.v ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-200 text-gray-700'}`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Дата</label>
                    <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d6a4f]" />
                  </div>
                  {blockType !== 'day' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">С</label>
                        <input type="time" value={blockTime} onChange={e => setBlockTime(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d6a4f]" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">До</label>
                        <input type="time" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d6a4f]" />
                      </div>
                    </div>
                  )}
                  <input
                    type="text"
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Причина (необязательно)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2d6a4f]"
                  />
                  <button
                    onClick={addBlock}
                    disabled={!blockDate}
                    className="w-full bg-[#2d6a4f] text-white font-medium py-2.5 rounded-lg hover:bg-[#1b4332] disabled:opacity-40 transition-colors"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {blocks.length === 0 && <p className="text-center text-gray-400 py-4">Блокировок нет</p>}
                {blocks.map(bl => (
                  <div key={bl.id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-red-700">
                        {bl.block_type === 'day' ? 'Весь день' : bl.block_type === 'trainer' ? 'Тренер' : 'Корт'}: {bl.block_date}
                        {bl.block_time && ` ${bl.block_time?.slice(0, 5)}–${bl.block_end_time?.slice(0, 5)}`}
                      </p>
                      {bl.reason && <p className="text-xs text-red-500">{bl.reason}</p>}
                    </div>
                    <button onClick={() => removeBlock(bl.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                      <Icon name="Trash2" size={16} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && tab === 'reviews' && (
            <div className="space-y-3">
              {reviews.length === 0 && <p className="text-center text-gray-400 py-8">Отзывов нет</p>}
              {reviews.map(r => (
                <div key={r.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-gray-800">{r.name}</p>
                      <p className="text-yellow-400 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    </div>
                    <button
                      onClick={() => deleteReview(r.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Icon name="Trash2" size={16} className="text-red-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{r.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'photo' && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Загрузите фото корта для главной страницы</p>
              {photoUrl && (
                <div className="mb-4">
                  <img src={photoUrl} alt="Корт" className="w-full rounded-xl object-cover h-48" />
                  <p className="text-xs text-green-600 mt-2">Фото обновлено — обновите страницу чтобы увидеть изменения</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoUploading}
                className="bg-[#2d6a4f] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
              >
                {photoUploading ? 'Загружаем...' : 'Выбрать фото'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}