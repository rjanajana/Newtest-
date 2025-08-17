// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAg6E4_J6q9n0kFWwMo_uq1G8nJlsmDSDA",
    authDomain: "turnament-c183f.firebaseapp.com",
    databaseURL: "https://turnament-c183f-default-rtdb.firebaseio.com",
    projectId: "turnament-c183f",
    storageBucket: "turnament-c183f.firebasestorage.app",
    messagingSenderId: "523966497566",
    appId: "1:523966497566:web:72f37516ecd277da4cff0f",
    measurementId: "G-EPP0V8N8L4"
};

// Initialize Firebase
let app, database;
try {
    if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log('Firebase initialized successfully');
    }
} catch (error) {
    console.log('Firebase not available:', error);
}

// Utility Functions
function showLoading(button) {
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
        console.log('Loading state activated for button');
    }
}

function hideLoading(button) {
    if (button) {
        button.classList.remove('loading');
        button.disabled = false;
        console.log('Loading state deactivated for button');
    }
}

function showResult(containerId, message, isError = false, data = null) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('Result container not found:', containerId);
        return;
    }
    
    container.className = `result-container show ${isError ? 'error' : 'success'}`;
    
    let content = `<strong>${isError ? 'Error:' : 'Success:'}</strong> ${message}`;
    
    if (data && !isError) {
        content += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    
    container.innerHTML = content;
    console.log('Result shown:', message);
}

function hideResult(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('show');
    }
}

// API Call Function
async function callExternalAPI(uid, isPremium = false) {
    console.log('Calling external API with UID:', uid, 'Premium:', isPremium);
    
    try {
        const response = await fetch('/api/call-external.py', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uid: uid,
                premium: isPremium
            })
        });
        
        console.log('API Response status:', response.status);
        
        const responseText = await response.text();
        console.log('API Response text:', responseText);
        
        const data = JSON.parse(responseText);
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(`API Error: ${error.message}`);
    }
}

// Get Client IP
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// Free Mode Handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Free Mode');
    
    const freeForm = document.getElementById('freeForm');
    if (freeForm) {
        console.log('Free form found, adding event listener');
        
        freeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Free form submitted');
            
            const uidInput = document.getElementById('freeUID');
            const submitBtn = freeForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            console.log('Free mode - UID entered:', uid);
            
            if (!uid) {
                showResult('freeResult', 'कृपया एक valid UID enter करें', true);
                return;
            }
            
            hideResult('freeResult');
            showLoading(submitBtn);
            
            try {
                const data = await callExternalAPI(uid, false);
                showResult('freeResult', 'Data successfully retrieved!', false, data);
                
                // Log to Firebase if available
                if (database) {
                    try {
                        database.ref('usage/free').push({
                            uid: uid,
                            timestamp: Date.now(),
                            ip: await getClientIP()
                        });
                        console.log('Usage logged to Firebase');
                    } catch (firebaseError) {
                        console.log('Firebase logging failed:', firebaseError);
                    }
                }
                
            } catch (error) {
                console.error('Free mode error:', error);
                showResult('freeResult', error.message, true);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Subscription/Payment Handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Payment');
    
    const subscriptionForm = document.getElementById('subscriptionForm');
    if (subscriptionForm) {
        console.log('Subscription form found, adding event listener');
        
        subscriptionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Payment form submitted');
            
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            const phone = document.getElementById('userPhone').value.trim();
            const submitBtn = subscriptionForm.querySelector('button[type="submit"]');
            
            console.log('Payment form data:', {name, email, phone});
            
            if (!name || !email || !phone) {
                alert('कृपया सभी fields भरें');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('कृपया valid email address enter करें');
                return;
            }
            
            // Phone validation
            if (phone.length < 10) {
                alert('कृपया valid phone number enter करें');
                return;
            }
            
            showLoading(submitBtn);
            
            try {
                console.log('Creating payment order...');
                
                // Create order
                const orderResponse = await fetch('/api/payment.py', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'create_order',
                        amount: 29900, // ₹299 in paise
                        currency: 'INR',
                        user_data: { name, email, phone }
                    })
                });
                
                console.log('Order response status:', orderResponse.status);
                
                const responseText = await orderResponse.text();
                console.log('Order response text:', responseText);
                
                const orderData = JSON.parse(responseText);
                console.log('Order data parsed:', orderData);
                
                if (!orderData.success) {
                    throw new Error(orderData.error || 'Order creation failed');
                }
                
                // Check if Razorpay is loaded
                if (typeof Razorpay === 'undefined') {
                    alert('Razorpay SDK not loaded. कृपया page refresh करें।');
                    return;
                }
                
                console.log('Opening Razorpay payment...');
                
                // Initialize Razorpay
                const options = {
                    key: orderData.key || 'rzp_test_lkoFfNbWaRVyLf',
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: 'Premium API Service',
                    description: 'Premium Subscription - ₹299/month',
                    order_id: orderData.order_id,
                    handler: function(response) {
                        console.log('Payment successful:', response);
                        handlePaymentSuccess(response, { name, email, phone });
                    },
                    prefill: {
                        name: name,
                        email: email,
                        contact: phone
                    },
                    theme: {
                        color: '#667eea'
                    },
                    modal: {
                        ondismiss: function() {
                            console.log('Payment modal dismissed');
                            hideLoading(submitBtn);
                        }
                    }
                };
                
                const rzp = new Razorpay(options);
                
                rzp.on('payment.failed', function(response) {
                    console.error('Payment failed:', response);
                    hideLoading(submitBtn);
                    alert('Payment failed: ' + (response.error?.description || 'Unknown error'));
                });
                
                rzp.open();
                
            } catch (error) {
                console.error('Payment process error:', error);
                hideLoading(submitBtn);
                alert('Error: ' + error.message);
            }
        });
    }
});

// Handle Payment Success
async function handlePaymentSuccess(response, userData) {
    console.log('Handling payment success...', response);
    
    try {
        // Store user session immediately
        localStorage.setItem('premium_user', JSON.stringify({
            ...userData,
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            signature: response.razorpay_signature,
            subscription_date: Date.now()
        }));
        
        console.log('User data stored in localStorage');
        
        // Try to verify payment (optional)
        try {
            const verifyResponse = await fetch('/api/payment.py', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify_payment',
                    ...response,
                    user_data: userData
                })
            });
            
            const verifyData = await verifyResponse.json();
            console.log('Payment verification result:', verifyData);
            
        } catch (verifyError) {
            console.log('Payment verification failed (but proceeding anyway):', verifyError);
        }
        
        // Log to Firebase if available
        if (database) {
            try {
                database.ref('payments').push({
                    ...userData,
                    payment_id: response.razorpay_payment_id,
                    order_id: response.razorpay_order_id,
                    amount: 299,
                    timestamp: Date.now(),
                    status: 'success'
                });
                console.log('Payment logged to Firebase');
            } catch (firebaseError) {
                console.log('Firebase logging failed:', firebaseError);
            }
        }
        
        alert('Payment Successful! 🎉 Dashboard पर redirect हो रहे हैं...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Payment success handling error:', error);
        alert('Payment completed but there was an error. कृपया dashboard manually open करें।');
    }
}

// Premium Dashboard Handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Dashboard');
    
    const premiumForm = document.getElementById('premiumForm');
    if (premiumForm) {
        console.log('Premium form found');
        
        // Check if user is premium
        const premiumUser = localStorage.getItem('premium_user');
        if (!premiumUser) {
            console.log('No premium user found, redirecting to subscription');
            alert('कृपया पहले subscription purchase करें');
            window.location.href = 'subscription.html';
            return;
        }
        
        const userData = JSON.parse(premiumUser);
        console.log('Premium user found:', userData);
        
        // Update dashboard stats
        updateDashboardStats(userData);
        
        premiumForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Premium form submitted');
            
            const uidInput = document.getElementById('premiumUID');
            const submitBtn = premiumForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            console.log('Premium mode - UID entered:', uid);
            
            if (!uid) {
                showResult('premiumResult', 'कृपया एक valid UID enter करें', true);
                return;
            }
            
            hideResult('premiumResult');
            showLoading(submitBtn);
            
            try {
                const data = await callExternalAPI(uid, true);
                showResult('premiumResult', 'Premium data successfully retrieved!', false, data);
                
                // Log usage to Firebase
                if (database) {
                    try {
                        database.ref('usage/premium').push({
                            uid: uid,
                            user_email: userData.email,
                            timestamp: Date.now(),
                            ip: await getClientIP()
                        });
                        console.log('Premium usage logged to Firebase');
                    } catch (firebaseError) {
                        console.log('Firebase logging failed:', firebaseError);
                    }
                }
                
            } catch (error) {
                console.error('Premium mode error:', error);
                showResult('premiumResult', error.message, true);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Update Dashboard Stats
function updateDashboardStats(userData) {
    console.log('Updating dashboard stats for user:', userData);
    
    const apiCalls = document.getElementById('apiCalls');
    const lastAccess = document.getElementById('lastAccess');
    const memberSince = document.getElementById('memberSince');
    
    if (apiCalls) {
        apiCalls.textContent = 'Unlimited';
    }
    
    if (lastAccess) {
        lastAccess.textContent = 'Just now';
    }
    
    if (memberSince && userData.subscription_date) {
        const date = new Date(userData.subscription_date);
        memberSince.textContent = date.toLocaleDateString('hi-IN');
    }
}

// Admin Panel Handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Admin Panel');
    
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminLogout = document.getElementById('adminLogout');
    
    if (adminLoginForm) {
        console.log('Admin login form found');
        
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Admin login form submitted');
            
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
            
            console.log('Admin login attempt:', username);
            
            showLoading(submitBtn);
            
            try {
                const response = await fetch('/api/admin.py', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'login',
                        username,
                        password
                    })
                });
                
                const responseText = await response.text();
                console.log('Admin login response:', responseText);
                
                const data = JSON.parse(responseText);
                
                if (response.ok && data.success) {
                    localStorage.setItem('admin_token', data.token);
                    console.log('Admin login successful');
                    
                    if (adminLogin) adminLogin.style.display = 'none';
                    if (adminDashboard) adminDashboard.style.display = 'block';
                    
                    loadAdminData();
                } else {
                    alert('Invalid credentials');
                }
                
            } catch (error) {
                console.error('Admin login error:', error);
                alert('Login failed: ' + error.message);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
    
    if (adminLogout) {
        adminLogout.addEventListener('click', function() {
            console.log('Admin logout clicked');
            localStorage.removeItem('admin_token');
            if (adminLogin) adminLogin.style.display = 'block';
            if (adminDashboard) adminDashboard.style.display = 'none';
        });
    }
    
    // Check if admin is already logged in
    if (localStorage.getItem('admin_token') && adminLogin && adminDashboard) {
        console.log('Admin already logged in');
        adminLogin.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAdminData();
    }
});

// Load Admin Data
async function loadAdminData() {
    console.log('Loading admin data...');
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            console.log('No admin token found');
            return;
        }
        
        const response = await fetch('/api/admin.py', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                action: 'get_stats'
            })
        });
        
        const responseText = await response.text();
        console.log('Admin stats response:', responseText);
        
        const data = JSON.parse(responseText);
        
        if (response.ok && data.success) {
            updateAdminStats(data);
            loadUsersTable(data.users || []);
            loadPaymentsTable(data.payments || []);
        } else {
            console.error('Failed to load admin data:', data.error);
        }
        
    } catch (error) {
        console.error('Admin data 