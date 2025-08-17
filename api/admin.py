import json
import hashlib
import jwt
import time
from http.server import BaseHTTPRequestHandler
import firebase_admin
from firebase_admin import credentials, db

# Admin credentials (in production, use environment variables)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"  # Change this!
JWT_SECRET = "your-jwt-secret-key"  # Change this!

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Set CORS headers
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            
            # Parse request data
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            action = request_data.get('action')
            
            if action == 'login':
                username = request_data.get('username')
                password = request_data.get('password')
                
                if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
                    # Generate JWT token
                    token_payload = {
                        'admin': True,
                        'exp': int(time.time()) + 3600,  # 1 hour
                        'iat': int(time.time())
                    }
                    
                    token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')
                    
                    result = {
                        'success': True,
                        'token': token,
                        'message': 'Login successful'
                    }
                else:
                    result = {
                        'success': False,
                        'error': 'Invalid credentials'
                    }
                
                self.wfile.write(json.dumps(result).encode())
                
            elif action == 'get_stats':
                # Verify admin token
                auth_header = self.headers.get('Authorization', '')
                if not auth_header.startswith('Bearer '):
                    raise ValueError("Authentication required")
                
                token = auth_header.split(' ')[1]
                
                try:
                    decoded_token = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
                    if not decoded_token.get('admin'):
                        raise ValueError("Admin access required")
                except jwt.ExpiredSignatureError:
                    raise ValueError("Token expired")
                except jwt.InvalidTokenError:
                    raise ValueError("Invalid token")
                
                # Get stats from Firebase
                stats = self.get_admin_stats()
                
                result = {
                    'success': True,
                    **stats
                }
                
                self.wfile.write(json.dumps(result).encode())
                
            else:
                raise ValueError("Invalid action")
                
        except Exception as e:
            error_response = {
                'success': False,
                'error': str(e)
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def get_admin_stats(self):
        try:
            # Get users data
            users_ref = db.reference('users')
            users_data = users_ref.get() or {}
            
            # Get orders data
            orders_ref = db.reference('orders')
            orders_data = orders_ref.get() or {}
            
            # Get API calls data
            api_calls_ref = db.reference('api_calls')
            api_calls_data = api_calls_ref.get() or {}
            
            # Calculate stats
            total_users = len(users_data)
            premium_users = sum(1 for user in users_data.values() if user.get('plan') == 'premium')
            total_revenue = sum(order.get('amount', 0) for order in orders_data.values() if order.get('status') == 'paid') / 100
            total_api_calls = len(api_calls_data)
            
            # Prepare users list
            users = []
            for user_id, user_data in users_data.items():
                users.append({
                    'id': user_id,
                    'name': user_data.get('name', ''),
                    'email': user_data.get('email', ''),
                    'plan': user_data.get('plan', 'free'),
                    'status': user_data.get('status', 'inactive'),
                    'joined': user_data.get('joined', 0)
                })
            
            # Prepare payments list
            payments = []
            for order_id, order_data in orders_data.items():
                if order_data.get('status') == 'paid':
                    user_data = order_data.get('user_data', {})
                    payments.append({
                        'order_id': order_id,
                        'user_name': user_data.get('name', ''),
                        'user_email': user_data.get('email', ''),
                        'amount': order_data.get('amount', 0),
                        'payment_id': order_data.get('payment_id', ''),
                        'status': 'success',
                        'created_at': order_data.get('created_at', 0)
                    })
            
            return {
                'total_users': total_users,
                'premium_users': premium_users,
                'total_revenue': int(total_revenue),
                'total_api_calls': total_api_calls,
                'users': users[-50:],  # Last 50 users
                'payments': payments[-50:]  # Last 50 payments
            }
            
        except Exception as e:
            print(f"Error getting admin stats: {e}")
            return {
                'total_users': 0,
                'premium_users': 0,
                'total_revenue': 0,
                'total_api_calls': 0,
                'users': [],
                'payments': []
            }
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
