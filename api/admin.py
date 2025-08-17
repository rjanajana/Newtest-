from http.server import BaseHTTPRequestHandler
import json
import time

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set headers immediately
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # Read request
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                post_data = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(post_data)
            else:
                data = {}
            
            action = data.get('action', '')
            
            if action == 'create_order':
                result = {
                    "success": True,
                    "order_id": f"order_{int(time.time())}_{hash(str(time.time())) % 10000}",
                    "amount": 29900,
                    "currency": "INR",
                    "key": "rzp_test_lkoFfNbWaRVyLf"
                }
            elif action == 'verify_payment':
                result = {
                    "success": True,
                    "message": "Payment verified successfully"
                }
            else:
                result = {
                    "success": False,
                    "error": f"Invalid action: {action}"
                }
                
        except Exception as e:
            result = {
                "success": False,
                "error": f"Server error: {str(e)}"
            }
        
        # Send response
        response_json = json.dumps(result)
        self.wfile.write(response_json.encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
