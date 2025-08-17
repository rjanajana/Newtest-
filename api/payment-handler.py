import json
import hashlib
import hmac
import time
import uuid
from http.server import BaseHTTPRequestHandler

# Razorpay credentials
RAZORPAY_KEY_ID = "rzp_test_lkoFfNbWaRVyLf"
RAZORPAY_KEY_SECRET = "CZeKvVHB8NClelJCTMDD2cc4"

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Set headers first
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                raise Exception('No data received')
                
            post_data = self.rfile.read(content_length).decode('utf-8')
            request_json = json.loads(post_data)
            action = request_json.get('action')
            
            if action == 'create_order':
                # Simple order creation without Razorpay SDK
                amount = request_json.get('amount', 29900)
                currency = request_json.get('currency', 'INR')
                user_data = request_json.get('user_data', {})
                
                # Generate unique order ID
                order_id = f"order_{int(time.time())}_{uuid.uuid4().hex[:8]}"
                
                result = {
                    'success': True,
                    'order_id': order_id,
                    'amount': amount,
                    'currency': currency,
                    'key': RAZORPAY_KEY_ID,
                    'name': 'Premium API Service',
                    'description': 'Premium Subscription - ₹299/month',
                    'user_data': user_data
                }
                
            elif action == 'verify_payment':
                # Payment verification
                payment_id = request_json.get('razorpay_payment_id', '')
                order_id = request_json.get('razorpay_order_id', '')
                signature = request_json.get('razorpay_signature', '')
                user_data = request_json.get('user_data', {})
                
                # Simple verification (for demo - in production use proper Razorpay verification)
                if payment_id and order_id and signature and len(signature) > 10:
                    result = {
                        'success': True,
                        'message': 'Payment verified successfully',
                        'payment_id': payment_id,
                        'order_id': order_id,
                        'user_data': user_data
                    }
                else:
                    result = {
                        'success': False,
                        'error': 'Payment verification failed - missing or invalid data'
                    }
                    
            else:
                result = {
                    'success': False,
                    'error': f'Invalid action: {action}. Use create_order or verify_payment'
                }
            
            # Send JSON response
            response_json = json.dumps(result)
            self.wfile.write(response_json.encode('utf-8'))
            
        except json.JSONDecodeError as e:
            error_dict = {
                'success': False,
                'error': f'Invalid JSON in request: {str(e)}'
            }
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_dict).encode('utf-8'))
            
        except Exception as e:
            error_dict = {
                'success': False,
                'error': f'Server error: {str(e)}',
                'timestamp': int(time.time() * 1000)
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_dict).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
