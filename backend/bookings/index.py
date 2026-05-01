import json
import os
import psycopg2
from datetime import datetime, date, time, timedelta

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Content-Type': 'application/json'
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Управление бронированиями: создание, получение, отмена, изменение"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET':
            phone = (event.get('queryStringParameters') or {}).get('phone', '')
            if phone:
                cur.execute(
                    "SELECT id, name, phone, booking_date, start_time, duration, balls, rackets_count, rackets_age, trainer, total_price, status, created_at, door_code FROM bookings WHERE phone = %s ORDER BY booking_date, start_time",
                    (phone,)
                )
            else:
                cur.execute(
                    "SELECT id, name, phone, booking_date, start_time, duration, balls, rackets_count, rackets_age, trainer, total_price, status, created_at, door_code FROM bookings ORDER BY booking_date, start_time"
                )
            rows = cur.fetchall()
            bookings = []
            for r in rows:
                bookings.append({
                    'id': r[0], 'name': r[1], 'phone': r[2],
                    'booking_date': str(r[3]), 'start_time': str(r[4]),
                    'duration': float(r[5]), 'balls': r[6],
                    'rackets_count': r[7], 'rackets_age': r[8],
                    'trainer': r[9], 'total_price': r[10],
                    'status': r[11], 'created_at': str(r[12]),
                    'door_code': r[13]
                })
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'bookings': bookings})}

        elif method == 'POST':
            booking_date = body['booking_date']
            start_time = body['start_time']
            duration = float(body['duration'])
            balls = body.get('balls', False)
            rackets_count = body.get('rackets_count', 0)
            rackets_age = body.get('rackets_age', '')
            trainer = body.get('trainer', False)
            name = body['name']
            phone = body['phone']
            total_price = body['total_price']

            start_h, start_m = map(int, start_time.split(':'))
            start_minutes = start_h * 60 + start_m
            end_minutes = start_minutes + int(duration * 60)
            end_h = end_minutes // 60
            end_m = end_minutes % 60
            end_time_str = f"{end_h:02d}:{end_m:02d}"

            cur.execute(
                "SELECT id FROM blocks WHERE (block_date = %s OR block_date IS NULL) AND block_type = 'day'",
                (booking_date,)
            )
            if cur.fetchone():
                return {'statusCode': 409, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'day_blocked', 'message': 'Этот день недоступен для бронирования'})}

            cur.execute(
                """SELECT id FROM blocks 
                   WHERE block_date = %s AND block_type = 'time'
                   AND NOT (block_end_time <= %s OR block_time >= %s)""",
                (booking_date, start_time, end_time_str)
            )
            if cur.fetchone():
                return {'statusCode': 409, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'time_blocked', 'message': 'Корт недоступен в это время'})}

            if trainer:
                cur.execute(
                    "SELECT id FROM blocks WHERE block_date = %s AND block_type = 'trainer' AND NOT (block_end_time <= %s OR block_time >= %s)",
                    (booking_date, start_time, end_time_str)
                )
                if cur.fetchone():
                    return {'statusCode': 409, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'trainer_blocked', 'message': 'Тренер недоступен в это время'})}

            cur.execute(
                """SELECT id FROM bookings 
                   WHERE booking_date = %s AND status NOT IN ('cancelled')
                   AND NOT (
                     (start_time + (duration || ' hours')::interval) <= %s::time
                     OR start_time >= %s::time
                   )""",
                (booking_date, start_time, end_time_str)
            )
            conflict = cur.fetchone()
            if conflict:
                cur.execute(
                    """SELECT start_time FROM bookings 
                       WHERE booking_date = %s AND status NOT IN ('cancelled')
                       ORDER BY start_time""",
                    (booking_date,)
                )
                taken = cur.fetchall()
                suggestion = find_nearest_slot(taken, duration, booking_date)
                return {'statusCode': 409, 'headers': CORS_HEADERS, 'body': json.dumps({
                    'error': 'time_conflict',
                    'message': 'Это время уже занято. Измените время или дату.',
                    'suggestion': suggestion
                })}

            cur.execute(
                """INSERT INTO bookings (name, phone, booking_date, start_time, duration, balls, rackets_count, rackets_age, trainer, total_price, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending') RETURNING id""",
                (name, phone, booking_date, start_time, duration, balls, rackets_count, rackets_age, trainer, total_price)
            )
            booking_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True, 'id': booking_id})}

        elif method == 'PUT':
            booking_id = body['id']
            action = body.get('action')

            cur.execute("SELECT booking_date, start_time, status FROM bookings WHERE id = %s", (booking_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'not_found'})}

            bdate, btime, bstatus = row
            now = datetime.now()
            booking_dt = datetime.combine(bdate, btime)
            diff = (booking_dt - now).total_seconds() / 60

            if action == 'cancel':
                if diff < 60:
                    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'too_late', 'message': 'Отменить можно не позднее чем за 1 час до начала'})}
                cur.execute("UPDATE bookings SET status = 'cancelled' WHERE id = %s", (booking_id,))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

            elif action == 'confirm':
                door_code = body.get('door_code', '')
                cur.execute("UPDATE bookings SET status = 'confirmed', door_code = %s WHERE id = %s", (door_code, booking_id))
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

            elif action == 'update':
                if diff < 60:
                    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'too_late', 'message': 'Изменить можно не позднее чем за 1 час до начала'})}
                new_date = body.get('booking_date', str(bdate))
                new_time = body.get('start_time', str(btime))
                new_duration = body.get('duration')
                new_balls = body.get('balls')
                new_rackets_count = body.get('rackets_count')
                new_rackets_age = body.get('rackets_age')
                new_trainer = body.get('trainer')
                new_price = body.get('total_price')
                cur.execute(
                    """UPDATE bookings SET booking_date=%s, start_time=%s, duration=%s, balls=%s,
                       rackets_count=%s, rackets_age=%s, trainer=%s, total_price=%s WHERE id=%s""",
                    (new_date, new_time, new_duration, new_balls, new_rackets_count, new_rackets_age, new_trainer, new_price, booking_id)
                )
                conn.commit()
                return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'bad_request'})}

    finally:
        cur.close()
        conn.close()


def find_nearest_slot(taken_rows, duration, booking_date):
    taken_times = [int(r[0].hour * 60 + r[0].minute) for r in taken_rows]
    for start in range(7 * 60, 24 * 60, 30):
        end = start + int(duration * 60)
        if end > 24 * 60:
            break
        conflict = False
        for t in taken_times:
            if not (end <= t or start >= t + int(duration * 60)):
                conflict = True
                break
        if not conflict:
            h = start // 60
            m = start % 60
            return f"{h:02d}:{m:02d}"
    return None