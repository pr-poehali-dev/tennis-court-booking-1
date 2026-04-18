import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const BOOKINGS_URL = 'https://functions.poehali.dev/1c87f267-5e77-414e-8812-eec899d49002';
const AVAIL_URL = 'https://functions.poehali.dev/90bb95cb-1754-45a2-acc1-a6a3f0ce4c7e';

const DURATIONS = [
  { value: 1, label: '1 час' },
  { value: 1.5, label: '1.5 часа' },
  { value: 2, label: '2 часа' },
];

const AGE_OPTIONS = ['3–6 лет', '7–12 лет', '13+ лет'];

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function parsePhone(v: string) {
  return v.replace(/\D/g, '');
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

const MIN_DATE = new Date('2026-04-20');
const MAX_DATE = new Date('2026-11-01');

type Step = 'date' | 'time' | 'extras' | 'contacts' | 'confirm';

interface Slot {
  time: string;
  end_time: string;
  available: boolean;
  reason: string | null;
}

export default function BookingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [balls, setBalls] = useState(false);
  const [racketsCount, setRacketsCount] = useState(0);
  const [racketsAge, setRacketsAge] = useState('');
  const [trainer, setTrainer] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dayBlocked, setDayBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [success, setSuccess] = useState(false);

  const endTime = (() => {
    if (!selectedTime) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    const end = h * 60 + m + duration * 60;
    return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  })();

  const total = (() => {
    let p = 1300 * duration;
    if (balls) p += 150 * duration;
    if (racketsCount > 0) p += 350 * duration * racketsCount;
    if (trainer) p += 800 * duration;
    return p;
  })();

  useEffect(() => {
    if (step === 'time' && selectedDate) {
      setLoadingSlots(true);
      fetch(`${AVAIL_URL}?date=${selectedDate}&duration=${duration}&trainer=${trainer}`)
        .then(r => r.json())
        .then(d => {
          setDayBlocked(d.day_blocked);
          setSlots(d.slots || []);
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [step, selectedDate, duration, trainer]);

  const getDates = () => {
    const dates: Date[] = [];
    const cur = new Date(MIN_DATE);
    while (cur <= MAX_DATE) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const [calMonth, setCalMonth] = useState(3); // April = 3
  const [calYear, setCalYear] = useState(2026);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  const handleSubmit = async () => {
    const digits = parsePhone(phone);
    if (name.trim().length < 2) { setError('Введите имя'); return; }
    if (digits.length !== 11) { setError('Введите корректный номер телефона'); return; }
    if (racketsCount > 0 && !racketsAge) { setError('Выберите возраст для ракетки'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(BOOKINGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: digits,
          booking_date: selectedDate,
          start_time: selectedTime,
          duration,
          balls,
          rackets_count: racketsCount,
          rackets_age: racketsAge,
          trainer,
          total_price: total,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('tennis_phone', digits);
        localStorage.setItem('tennis_name', name.trim());
        setSuccess(true);
      } else if (data.error === 'time_conflict') {
        setError(data.message);
        setSuggestion(data.suggestion ? `Ближайший свободный: ${data.suggestion}` : '');
        setStep('time');
      } else {
        setError(data.message || 'Ошибка при бронировании');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ModalWrap onClose={onClose}>
        <div className="text-center py-8 px-4">
          <div className="w-16 h-16 bg-[#d8f3dc] rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="CheckCircle" size={32} className="text-[#2d6a4f]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Бронь создана!</h2>
          <p className="text-gray-600 mb-6">
            {selectedDate} с {selectedTime} до {endTime}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
            <p className="font-semibold text-amber-800 mb-1">Важно — оплата</p>
            <p className="text-amber-700 text-sm">
              Переведите <strong>{total} ₽</strong> по номеру{' '}
              <strong>8 930 278 29 29</strong> (Арсений, Т-Банк) не позднее чем
              за 10 минут до начала. Иначе бронь сгорает.
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-[#2d6a4f] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#1b4332] transition-colors"
          >
            Понятно
          </button>
        </div>
      </ModalWrap>
    );
  }

  return (
    <ModalWrap onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        {step !== 'date' && (
          <button onClick={() => {
            const steps: Step[] = ['date', 'time', 'extras', 'contacts'];
            const idx = steps.indexOf(step);
            if (idx > 0) setStep(steps[idx - 1]);
          }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon name="ArrowLeft" size={18} />
          </button>
        )}
        <h2 className="text-xl font-bold text-gray-900">
          {step === 'date' && 'Выберите дату'}
          {step === 'time' && 'Выберите время'}
          {step === 'extras' && 'Дополнительно'}
          {step === 'contacts' && 'Ваши данные'}
          {step === 'confirm' && 'Подтверждение'}
        </h2>
      </div>

      {step === 'date' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }}
              disabled={calMonth === 3 && calYear === 2026}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              <Icon name="ChevronLeft" size={18} />
            </button>
            <span className="font-semibold text-gray-800">{MONTHS[calMonth]} {calYear}</span>
            <button
              onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }}
              disabled={calMonth === 10 && calYear === 2026}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
            >
              <Icon name="ChevronRight" size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = new Date(calYear, calMonth, i + 1);
              const ds = formatDate(d);
              const inRange = d >= MIN_DATE && d <= MAX_DATE;
              const selected = ds === selectedDate;
              return (
                <button
                  key={ds}
                  disabled={!inRange}
                  onClick={() => setSelectedDate(ds)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all
                    ${selected ? 'bg-[#2d6a4f] text-white' : ''}
                    ${inRange && !selected ? 'hover:bg-[#d8f3dc] text-gray-800' : ''}
                    ${!inRange ? 'text-gray-300 cursor-not-allowed' : ''}
                  `}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button
            disabled={!selectedDate}
            onClick={() => setStep('time')}
            className="mt-6 w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] disabled:opacity-40 transition-colors"
          >
            Далее
          </button>
        </div>
      )}

      {step === 'time' && (
        <div>
          <p className="text-gray-500 text-sm mb-4">
            {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </p>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Длительность</p>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => { setDuration(d.value); setSelectedTime(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                    ${duration === d.value ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-200 text-gray-700 hover:border-[#2d6a4f]'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {loadingSlots && <p className="text-center text-gray-400 py-8">Загружаю расписание...</p>}
          {dayBlocked && <p className="text-center text-red-500 py-8">Этот день недоступен для бронирования</p>}

          {!loadingSlots && !dayBlocked && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Время начала</p>
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    title={slot.available ? '' : slot.reason === 'trainer' ? 'Тренер недоступен' : 'Занято'}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all
                      ${selectedTime === slot.time ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : ''}
                      ${slot.available && selectedTime !== slot.time ? 'border-gray-200 text-gray-800 hover:border-[#2d6a4f]' : ''}
                      ${!slot.available ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed line-through' : ''}
                    `}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestion && (
            <p className="text-sm text-[#2d6a4f] mt-2 bg-[#d8f3dc] px-3 py-2 rounded-lg">{suggestion}</p>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

          <button
            disabled={!selectedTime}
            onClick={() => { setError(''); setSuggestion(''); setStep('extras'); }}
            className="mt-4 w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] disabled:opacity-40 transition-colors"
          >
            Далее
          </button>
        </div>
      )}

      {step === 'extras' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, {selectedTime} — {endTime}
            </p>
            <p className="font-semibold text-gray-800">Корт: {1300 * duration} ₽</p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-800">Мячи</p>
                <p className="text-sm text-gray-500">150 ₽/час</p>
              </div>
              <input
                type="checkbox"
                checked={balls}
                onChange={e => setBalls(e.target.checked)}
                className="w-5 h-5 accent-[#2d6a4f]"
              />
            </label>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-800">Ракетка</p>
                  <p className="text-sm text-gray-500">350 ₽/час за штуку</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRacketsCount(Math.max(0, racketsCount - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700 font-bold"
                  >−</button>
                  <span className="w-6 text-center font-semibold">{racketsCount}</span>
                  <button
                    onClick={() => setRacketsCount(Math.min(4, racketsCount + 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700 font-bold"
                  >+</button>
                </div>
              </div>
              {racketsCount > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Возраст игрока:</p>
                  <div className="flex gap-2 flex-wrap">
                    {AGE_OPTIONS.map(a => (
                      <button
                        key={a}
                        onClick={() => setRacketsAge(a)}
                        className={`px-3 py-1 rounded-lg text-sm border transition-all
                          ${racketsAge === a ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'border-gray-200 text-gray-700 hover:border-[#2d6a4f]'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center justify-between cursor-pointer border-t border-gray-100 pt-3">
              <div>
                <p className="font-medium text-gray-800">Тренер</p>
                <p className="text-sm text-gray-500">800 ₽/час</p>
              </div>
              <input
                type="checkbox"
                checked={trainer}
                onChange={e => setTrainer(e.target.checked)}
                className="w-5 h-5 accent-[#2d6a4f]"
              />
            </label>
          </div>

          <div className="bg-[#d8f3dc] rounded-xl p-4 flex items-center justify-between">
            <span className="font-semibold text-[#1b4332]">Итого</span>
            <span className="font-bold text-xl text-[#1b4332]">{total} ₽</span>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={() => { setError(''); setStep('contacts'); }}
            className="w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] transition-colors"
          >
            Далее
          </button>
        </div>
      )}

      {step === 'contacts' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, {selectedTime}–{endTime} · <strong>{total} ₽</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ваше имя</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Иван Иванов"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Номер телефона</label>
            <input
              type="tel"
              value={formatPhoneDisplay(phone)}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                setPhone(raw.startsWith('8') || raw.startsWith('7') ? raw : '7' + raw);
              }}
              placeholder="+7 (___) ___-__-__"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-[#2d6a4f] focus:ring-1 focus:ring-[#2d6a4f]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#2d6a4f] text-white font-semibold py-3 rounded-xl hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Бронируем...' : 'Забронировать'}
          </button>
        </div>
      )}
    </ModalWrap>
  );
}

function ModalWrap({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Icon name="X" size={18} className="text-gray-500" />
        </button>
        {children}
      </div>
    </div>
  );
}