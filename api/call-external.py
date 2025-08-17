import json
import requests
from http.server import BaseHTTPRequestHandler
import firebase_admin
from firebase_admin import credentials, db
import os

# Initialize Firebase Admin (only once)
if not firebase_admin._apps:
    # Use environment variables or default config
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": "subscription-api-service",
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID", ""),
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL", ""),
        "client_id": os.environ.get("FIREBASE_CLIENT_ID", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    })
    
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://subscription-api-service-default-rtdb.asia-southeast1.firebasedatabase.app'
    })

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
            
            uid = request_data.get('uid')
            is_premium = request_data.get('premium', False)
            
            if not uid:
                raise ValueError("UID is required")
            
            # Validate UID format (basic validation)
            if len(uid.strip()) < 3:
                raise ValueError("Invalid UID format")
            
            # Call external API
            external_api_url = f"https://narayan-like-api-wine.vercel.app/{uid}/ind/xyz"
            
            headers = {
                'User-Agent': 'Premium-API-Service/1.0',
                'Accept': 'application/json',
            }
            
            # Add premium headers if applicable
            if is_premium:
                headers['X-Premium-Access'] = 'true'
            
            response = requests.get(external_api_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                api_data = response.json()
                
                # Log the API call to Firebase
                try:
                    ref = db.reference('api_calls')
                    ref.push({
                        'uid': uid,
                        'premium': is_premium,
                        'timestamp': firebase_admin.firestore.SERVER_TIMESTAMP,
                        'status': 'success',
                        'response_size': len(response.text)
                    })
                except Exception as e:
                    print(f"Firebase logging error: {e}")
                
                # Return successful response
                result = {
                    'success': True,
                    'data': api_data,
                    'premium': is_premium,
                    'uid': uid,
                    'timestamp': int(time.time() * 1000)
                }
                
                # Limit data for free users
                if not is_premium:
                    # Truncate response for free users
                    if isinstance(api_data, dict) and len(str(api_data)) > 1000:
                        result['data'] = {
                            'message': 'Limited data for free users',
                            'sample': str(api_data)[:500] + '...',
                            'upgrade_message': 'Subscribe to Premium for full data access'
                        }
                
                self.wfile.write(json.dumps(result).encode())
                
            else:
                raise Exception(f"External API error: {response.status_code}")
                
        except Exception as e:
            error_response = {
                'success': False,
                'error': str(e),
                'timestamp': int(time.time() * 1000)
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
