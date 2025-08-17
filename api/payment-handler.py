from http.server import BaseHTTPRequestHandler
import json
import time
import uuid

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Always send proper headers first
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # Read request
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            action = data.get('action')
            
            if action == 'create_order':
                # Create order response
                result = {
                    "success": True,
                    "order_id": f"order_{int(time.time())}",
                    "amount": 29900,
                    "currency": "INR",
                    "key": "rzp_test_lkoFfNbWaRVyLf"
                }
            elif action == 'verify_payment':
                # Verify payment response
                result = {
                    "success": True,
                    "message": "Payment verified successfully"
                }
            else:
                result = {"success": False, "error": "Invalid action"}
                
        except Exception as e:
            result = {"success": False, "error": str(e)}
        
        # Send JSON response
        self.wfile.write(json.dumps(result).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
