import json
import hashlib
import hmac
import time
from http.server import BaseHTTPRequestHandler

# Razorpay credentials
RAZORPAY_KEY_ID = "rzp_test_lkoFfNbWaRVyLf"
RAZORPAY_KEY_SECRET = "CZeKvVHB8NClelJCTMDD2cc4"

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
            
            if action == 'create_order':
                # For demo purposes, create a simple order response
                amount = request_json.get('amount', 29900)
                currency = request_json.get('currency', 'INR')
                
                # Simple order ID generation (in production, use Razorpay API)
                order_id = f"order_{int(time.time())}"
                
                result = {
                    'success': True,
                    'order_id': order_id,
                    'amount': amount,
                    'currency': currency,
                    'key': RAZORPAY_KEY_ID
                }
                
                status_code = 200
                
            elif action == 'verify_payment':
                payment_id = request_json.get('razorpay_payment_id', '')
                order_id = request_json.get('razorpay_order_id', '')
                signature = request_json.get('razorpay_signature', '')
                
                # Simple verification for demo (in production, use proper Razorpay verification)
                if payment_id and order_id and signature:
                    result = {
                        'success': True,
                        'message': 'Payment verified successfully',
                        'payment_id': payment_id,
                        'order_id': order_id
                    }
                    status_code = 200
                else:
                    result = {
                        'success': False,
                        'error': 'Payment verification failed - missing data'
                    }
                    status_code = 400
            else:
                result = {
                    'success': False,
                    'error': 'Invalid action. Use create_order or verify_payment'
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
