import json
import requests
import time
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            if not post_data:
                raise Exception('No data received')
                
            request_json = json.loads(post_data)
            uid = request_json.get('uid')
            is_premium = request_json.get('premium', False)
            
            if not uid:
                raise Exception('UID is required')
            
            # Call external API
            url = f'https://narayan-like-api-wine.vercel.app/{uid}/ind/xyz'
            headers = {
                'User-Agent': 'Premium-API-Service/1.0',
                'Accept': 'application/json',
            }
            
            if is_premium:
                headers['X-Premium-Access'] = 'true'
            
            response = requests.get(url, headers=headers, timeout=10)
            
            # Parse API response
            try:
                if response.status_code == 200:
                    api_data = response.json()
                else:
                    api_data = {'error': f'API returned status {response.status_code}'}
            except:
                api_data = {'error': 'External API did not return valid JSON'}
            
            # Limit data for free users
            if not is_premium and isinstance(api_data, dict) and len(str(api_data)) > 500:
                api_data = {
                    'message': 'Limited data for free users',
                    'sample': str(api_data)[:200] + '...',
                    'upgrade': 'Subscribe to Premium for full data access'
                }
            
            result = {
                'success': True,
                'data': api_data,
                'uid': uid,
                'premium': is_premium,
                'timestamp': int(time.time() * 1000)
            }
            
            # Send proper JSON response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            # Always send JSON error response
            error_dict = {
                'success': False,
                'error': str(e),
                'timestamp': int(time.time() * 1000)
            }
            
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            
            self.wfile.write(json.dumps(error_dict).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
