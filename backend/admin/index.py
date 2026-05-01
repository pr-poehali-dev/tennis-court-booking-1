import json
import os
import psycopg2
import boto3
import urllib.request
import urllib.parse

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Content-Type': 'application/json'
}

ADMIN_PASSWORD = 'Pinkpups07'


def send_sms(phone: str, message: str):
    login = os.environ.get('SMSC_LOGIN', '')
    password = os.environ.get('SMSC_PASSWORD', '')
    if not login or not password:
        return
    clean_phone = ''.join(c for c in phone if c.isdigit())
    params = urllib.parse.urlencode({
        'login': login,
        'psw': password,
        'phones': clean_phone,
        'mes': message,
        'charset': 'utf-8',
        'fmt': '3',
    })
    url = f'https://smsc.ru/sys/send.php?{params}'
    try:
        urllib.request.urlopen(url, timeout=10)
    except Exception:
        pass


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Админ-панель: брони, блокировки, фото корта, подтверждение/отмена"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    params = event.get('queryStringParameters') or {}
    action = params.get('action') or body.get('action', '')

    if action == 'login':
        pwd = body.get('password', '')
        if pwd == ADMIN_PASSWORD:
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True, 'token': 'admin_ok'})}
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'wrong_password'})}

    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    if token != 'admin_ok':
        return {'statusCode': 401, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'unauthorized'})}

    conn = get_conn()
    cur = conn.cursor()

    try:
        if action == 'get_bookings':
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

        elif action == 'confirm_booking':
            bid = body.get('id')
            door_code = body.get('door_code', '')
            cur.execute("SELECT phone, name, booking_date, start_time FROM bookings WHERE id = %s", (bid,))
            brow = cur.fetchone()
            cur.execute("UPDATE bookings SET status = 'confirmed', door_code = %s WHERE id = %s", (door_code, bid))
            conn.commit()
            if brow and door_code:
                phone, name, bdate, btime = brow
                btime_str = str(btime)[:5]
                bdate_parts = str(bdate).split('-')
                bdate_str = f"{bdate_parts[2]}.{bdate_parts[1]}.{bdate_parts[0]}" if len(bdate_parts) == 3 else str(bdate)
                sms_text = (
                    f"Теннисный корт Бурцево: ваша бронь на {bdate_str} в {btime_str} подтверждена! "
                    f"Пароль от корта: {door_code}. "
                    f"Оплата за 1 час до начала на 8930278-29-29 (Арсений, Т-Банк)."
                )
                send_sms(phone, sms_text)
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

        elif action == 'cancel_booking':
            bid = body.get('id')
            cur.execute("UPDATE bookings SET status = 'cancelled' WHERE id = %s", (bid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

        elif action == 'delete_booking':
            bid = body.get('id')
            cur.execute("DELETE FROM bookings WHERE id = %s", (bid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

        elif action == 'get_reviews':
            cur.execute("SELECT id, name, rating, text, created_at FROM reviews ORDER BY created_at DESC")
            rows = cur.fetchall()
            reviews = [{'id': r[0], 'name': r[1], 'rating': r[2], 'text': r[3], 'created_at': str(r[4])} for r in rows]
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'reviews': reviews})}

        elif action == 'delete_review':
            rid = body.get('id')
            cur.execute("DELETE FROM reviews WHERE id = %s", (rid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

        elif action == 'add_block':
            block_date = body.get('block_date')
            block_time = body.get('block_time')
            block_end_time = body.get('block_end_time')
            block_type = body.get('block_type', 'time')
            reason = body.get('reason', '')
            cur.execute(
                "INSERT INTO blocks (block_date, block_time, block_end_time, block_type, reason) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (block_date, block_time, block_end_time, block_type, reason)
            )
            block_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True, 'id': block_id})}

        elif action == 'remove_block':
            bid = body.get('id')
            cur.execute("DELETE FROM blocks WHERE id = %s", (bid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True})}

        elif action == 'get_blocks':
            cur.execute("SELECT id, block_date, block_time, block_end_time, block_type, reason FROM blocks ORDER BY block_date, block_time")
            rows = cur.fetchall()
            blocks = [{'id': r[0], 'block_date': str(r[1]) if r[1] else None, 'block_time': str(r[2]) if r[2] else None, 'block_end_time': str(r[3]) if r[3] else None, 'block_type': r[4], 'reason': r[5]} for r in rows]
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'blocks': blocks})}

        elif action == 'upload_image':
            import base64
            image_data = body.get('image_data', '')
            image_type = body.get('image_type', 'image/jpeg')
            image_bytes = base64.b64decode(image_data)
            s3 = boto3.client('s3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
            )
            key = 'court/court_photo.jpg'
            s3.put_object(Bucket='files', Key=key, Body=image_bytes, ContentType=image_type)
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"
            cur.execute("UPDATE settings SET value = %s WHERE key = 'court_image'", (cdn_url,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True, 'url': cdn_url})}

        elif action == 'get_settings':
            cur.execute("SELECT key, value FROM settings")
            rows = cur.fetchall()
            settings = {r[0]: r[1] for r in rows}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'settings': settings})}

        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'unknown_action'})}

    finally:
        cur.close()
        conn.close()