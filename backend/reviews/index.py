import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Получение и добавление отзывов"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET':
            cur.execute("SELECT id, name, rating, text, created_at FROM reviews ORDER BY created_at DESC")
            rows = cur.fetchall()
            reviews = [{'id': r[0], 'name': r[1], 'rating': r[2], 'text': r[3], 'created_at': str(r[4])} for r in rows]
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'reviews': reviews})}

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            name = body['name']
            rating = int(body['rating'])
            text = body['text']
            if not (1 <= rating <= 5):
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'invalid_rating'})}
            cur.execute("INSERT INTO reviews (name, rating, text) VALUES (%s, %s, %s) RETURNING id", (name, rating, text))
            review_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'success': True, 'id': review_id})}

        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'bad_request'})}

    finally:
        cur.close()
        conn.close()
