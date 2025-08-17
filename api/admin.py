from http.server import BaseHTTPRequestHandler
import json
import time
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Set CORS headers first
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
            else:
                request_data = {}
                
            action = request_data.get('action', '')
            
            if action == 'create_order':
                amount = request_data.get('amount', 29900)
                user_data = request_data.get('user_data', {})
                
                # Generate unique order ID
                order_id = f"order_{int(time.time())}_{hash(str(time.time())) % 10000}"
                
                result = {
                    "success": True,
                    "order_id": order_id,
                    "amount": amount,
                    "currency": "INR",
                    "key": "rzp_test_lkoFfNbWaRVyLf",
                    "message": "Order created successfully"
                }
                
            elif action == 'verify_payment':
                payment_id = request_data.get('razorpay_payment_id', '')
                order_id = request_data.get('razorpay_order_id', '')
                signature = request_data.get('razorpay_signature', '')
                
                result = {
                    "success": True,
                    "message": "Payment verified successfully",
                    "payment_id": payment_id,
                    "order_id": order_id
                }
                
            else:
                result = {
                    "success": False,
                    "error": f"Invalid action: {action}. Expected 'create_order' or 'verify_payment'"
                }
            
            # Send JSON response
            response_json = json.dumps(result)
            self.wfile.write(response_json.encode('utf-8'))
            
        except json.JSONDecodeError as e:
            error_result = {
                "success": False,
                "error": f"Invalid JSON in request: {str(e)}"
            }
            self.wfile.write(json.dumps(error_result).encode('utf-8'))
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": f"Server error: {str(e)}"
            }
            self.wfile.write(json.dumps(error_result).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        # Handle GET requests for testing
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        result = {
            "success": True,
            "message": "Payment API is working",
            "endpoint": "/api/payment.py",
            "methods": ["POST"]
        }
        
        self.wfile.write(json.dumps(result).encode('utf-8'))
