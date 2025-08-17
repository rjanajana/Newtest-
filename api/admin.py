import json
import time
from http.server import BaseHTTPRequestHandler

# Simple admin credentials (change these!)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            if not post_data:
                raise Exception('No data received')
                
            request_json = json.loads(post_data)
            action = request_json.get('action')
            
            if action == 'login':
                username = request_json.get('username', '')
                password = request_json.get('password', '')
                
                if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
                    result = {
                        'success': True,
                        'token': f'admin_token_{int(time.time())}',
                        'message': 'Login successful'
                    }
                    status_code = 200
                else:
                    result = {
                        'success': False,
                        'error': 'Invalid credentials'
                    }
                    status_code = 401
                    
            elif action == 'get_stats':
                # Return demo stats
                result = {
                    'success': True,
                    'total_users': 25,
                    'premium_users': 5,
                    'total_revenue': 1495,
                    'total_api_calls': 150,
                    'users': [
                        {
                            'id': 'user1',
                            'name': 'Demo User',
                            'email': 'demo@example.com',
                            'plan': 'premium',
                            'status': 'active',
                            'joined': int(time.time() * 1000) - 86400000
                        }
                    ],
                    'payments': [
                        {
                            'order_id': 'order_demo',
                            'user_name': 'Demo User',
                            'user_email': 'demo@example.com',
                            'amount': 29900,
                            'payment_id': 'pay_demo',
                            'status': 'success',
                            'created_at': int(time.time() * 1000) - 86400000
                        }
                    ]
                }
                status_code = 200
            else:
                result = {
                    'success': False,
                    'error': 'Invalid action'
                }
                status_code = 400
            
            # Send proper JSON response
            self.send_response(status_code)
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
            
            self.send_response(500)
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
