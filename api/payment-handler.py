import json
import razorpay
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler
import firebase_admin
from firebase_admin import credentials, db
import time

# Razorpay Configuration
RAZORPAY_KEY_ID = "rzp_test_lkoFfNbWaRVyLf"
RAZORPAY_KEY_SECRET = "CZeKvVHB8NClelJCTMDD2cc4"

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

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
            
            if action == 'create_order':
                # Create Razorpay order
                amount = request_data.get('amount', 29900)  # ₹299 in paise
                currency = request_data.get('currency', 'INR')
                user_data = request_data.get('user_data', {})
                
                order_data = {
                    'amount': amount,
                    'currency': currency,
                    'receipt': f"order_{int(time.time())}",
                    'notes': {
                        'user_name': user_data.get('name', ''),
                        'user_email': user_data.get('email', ''),
                        'user_phone': user_data.get('phone', '')
                    }
                }
                
                order = razorpay_client.order.create(data=order_data)
                
                # Store order in Firebase
                try:
                    ref = db.reference('orders')
                    ref.child(order['id']).set({
                        'order_id': order['id'],
                        'amount': amount,
                        'currency': currency,
                        'user_data': user_data,
                        'status': 'created',
                        'created_at': int(time.time() * 1000)
                    })
                except Exception as e:
                    print(f"Firebase error: {e}")
                
                result = {
                    'success': True,
                    'order_id': order['id'],
                    'amount': order['amount'],
                    'currency': order['currency']
                }
                
                self.wfile.write(json.dumps(result).encode())
                
            elif action == 'verify_payment':
                # Verify Razorpay payment
                payment_id = request_data.get('razorpay_payment_id')
                order_id = request_data.get('razorpay_order_id')
                signature = request_data.get('razorpay_signature')
                user_data = request_data.get('user_data', {})
                
                # Verify signature
                generated_signature = hmac.new(
                    RAZORPAY_KEY_SECRET.encode(),
                    f"{order_id}|{payment_id}".encode(),
                    hashlib.sha256
                ).hexdigest()
                
                if hmac.compare_digest(generated_signature, signature):
                    # Payment verified successfully
                    
                    # Update order status in Firebase
                    try:
                        ref = db.reference('orders')
                        ref.child(order_id).update({
                            'status': 'paid',
                            'payment_id': payment_id,
                            'signature': signature,
                            'paid_at': int(time.time() * 1000)
                        })
                        
                        # Create user record
                        users_ref = db.reference('users')
                        user_id = f"user_{int(time.time())}"
                        users_ref.child(user_id).set({
                            'name': user_data.get('name', ''),
                            'email': user_data.get('email', ''),
                            'phone': user_data.get('phone', ''),
                            'plan': 'premium',
                            'status': 'active',
                            'payment_id': payment_id,
                            'order_id': order_id,
                            'joined': int(time.time() * 1000),
                            'expires_at': int(time.time() * 1000) + (30 * 24 * 60 * 60 * 1000)  # 30 days
                        })
                        
                    except Exception as e:
                        print(f"Firebase error: {e}")
                    
                    result = {
                        'success': True,
                        'message': 'Payment verified successfully',
                        'payment_id': payment_id,
                        'order_id': order_id
                    }
                    
                else:
                    result = {
                        'success': False,
                        'error': 'Payment verification failed'
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
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
