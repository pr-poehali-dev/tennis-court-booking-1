
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration NUMERIC(3,1) NOT NULL,
  balls BOOLEAN DEFAULT FALSE,
  rackets_count INTEGER DEFAULT 0,
  rackets_age VARCHAR(50),
  trainer BOOLEAN DEFAULT FALSE,
  total_price INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocks (
  id SERIAL PRIMARY KEY,
  block_date DATE,
  block_time TIME,
  block_end_time TIME,
  block_type VARCHAR(20) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

INSERT INTO settings (key, value) VALUES ('court_image', '') ON CONFLICT (key) DO NOTHING;
