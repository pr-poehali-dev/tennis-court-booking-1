import json
import os
import psycopg2
from datetime import datetime

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Проверка доступности слотов на дату"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    booking_date = params.get('date', '')
    duration = float(params.get('duration', '1'))
    check_trainer = params.get('trainer', 'false') == 'true'

    if not booking_date:
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'date_required'})}

    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute("SELECT id FROM blocks WHERE block_date = %s AND block_type = 'day'", (booking_date,))
        if cur.fetchone():
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'day_blocked': True, 'slots': []})}

        cur.execute(
            "SELECT start_time, duration FROM bookings WHERE booking_date = %s AND status NOT IN ('cancelled')",
            (booking_date,)
        )
        booked = cur.fetchall()

        cur.execute(
            "SELECT block_time, block_end_time, block_type FROM blocks WHERE block_date = %s AND block_type IN ('time', 'trainer')",
            (booking_date,)
        )
        blocks = cur.fetchall()

        now = datetime.now()
        now_minutes = now.hour * 60 + now.minute

        from datetime import date as date_type
        try:
            req_date = datetime.strptime(booking_date, '%Y-%m-%d').date()
        except Exception:
            req_date = None

        is_today = (req_date == now.date()) if req_date else False

        slots = []
        for start_h in range(7, 24):
            for start_m in [0, 30]:
                start_minutes = start_h * 60 + start_m
                end_minutes = start_minutes + int(duration * 60)
                if end_minutes > 24 * 60:
                    continue

                start_str = f"{start_h:02d}:{start_m:02d}"
                end_h = end_minutes // 60
                end_m = end_minutes % 60
                end_str = f"{end_h:02d}:{end_m:02d}"

                blocked = False
                block_reason = None

                if is_today and start_minutes <= now_minutes:
                    blocked = True
                    block_reason = 'past'

                if not blocked:
                    for bt, bet, btype in blocks:
                        if btype == 'trainer' and not check_trainer:
                            continue
                        bt_min = bt.hour * 60 + bt.minute
                        bet_min = bet.hour * 60 + bet.minute
                        if not (end_minutes <= bt_min or start_minutes >= bet_min):
                            blocked = True
                            block_reason = 'trainer' if btype == 'trainer' else 'court'
                            break

                if not blocked:
                    for bst, bdur in booked:
                        bst_min = bst.hour * 60 + bst.minute
                        bend_min = bst_min + int(float(bdur) * 60)
                        if not (end_minutes <= bst_min or start_minutes >= bend_min):
                            blocked = True
                            block_reason = 'booked'
                            break

                slots.append({
                    'time': start_str,
                    'end_time': end_str,
                    'available': not blocked,
                    'reason': block_reason
                })

        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'day_blocked': False, 'slots': slots})}

    finally:
        cur.close()
        conn.close()
