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
        console.log('✅ Firebase initialized successfully');
    }
} catch (error) {
    console.log('⚠️ Firebase not available:', error);
}

// Utility Functions
function showLoading(button) {
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
        console.log('🔄 Loading state activated');
    }
}

function hideLoading(button) {
    if (button) {
        button.classList.remove('loading');
        button.disabled = false;
        console.log('✅ Loading state deactivated');
    }
}

function showResult(containerId, message, isError = false, data = null) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.log('❌ Result container not found:', containerId);
        return;
    }
    
    container.className = `result-container show ${isError ? 'error' : 'success'}`;
    
    let content = `<strong>${isError ? 'Error:' : 'Success:'}</strong> ${message}`;
    
    if (data && !isError) {
        content += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    
    container.innerHTML = content;
    console.log('📢 Result shown:', message);
}

function hideResult(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('show');
    }
}

// API Call Function
async function callExternalAPI(uid, isPremium = false) {
    console.log('🔌 Calling external API - UID:', uid, 'Premium:', isPremium);
    
    try {
        const response = await fetch('/api/call-external', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uid: uid,
                premium: isPremium
            })
        });
        
        console.log('📡 API Response status:', response.status);
        
        const responseText = await response.text();
        console.log('📄 API Response text:', responseText);
        
        const data = JSON.parse(responseText);
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
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
    console.log('🚀 DOM Loaded - Initializing Free Mode');
    
    const freeForm = document.getElementById('freeForm');
    if (freeForm) {
        console.log('📝 Free form found, adding event listener');
        
        freeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('▶️ Free form submitted');
            
            const uidInput = document.getElementById('freeUID');
            const submitBtn = freeForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            console.log('🆔 Free mode - UID entered:', uid);
            
            if (!uid) {
                showResult('freeResult', 'कृपया एक valid UID enter करें', true);
                return;
            }
            
            if (uid.length < 3) {
                showResult('freeResult', 'UID कम से कम 3 characters का होना चाहिए', true);
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
                        console.log('📊 Usage logged to Firebase');
                    } catch (firebaseError) {
                        console.log('⚠️ Firebase logging failed:', firebaseError);
                    }
                }
                
            } catch (error) {
                console.error('❌ Free mode error:', error);
                showResult('freeResult', error.message, true);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Payment Handler - COMPLETE WORKING VERSION
document.addEventListener('DOMContentLoaded', function() {
    console.log('💳 DOM Loaded - Initializing Payment');
    
    // Wait for Razorpay to load
    function waitForRazorpay() {
        if (typeof Razorpay !== 'undefined') {
            console.log('✅ Razorpay SDK loaded successfully');
            initializePaymentButton();
        } else {
            console.log('⏳ Waiting for Razorpay SDK...');
            setTimeout(waitForRazorpay, 100);
        }
    }
    
    // Only initialize if we're on payment page
    if (document.getElementById('payButton') || document.getElementById('subscriptionForm')) {
        waitForRazorpay();
    }
});

function initializePaymentButton() {
    // Handle both form submit and direct button click
    const subscriptionForm = document.getElementById('subscriptionForm');
    const payButton = document.getElementById('payButton');
    
    if (subscriptionForm && !payButton) {
        // Old form structure
        subscriptionForm.addEventListener('submit', handlePaymentSubmit);
        console.log('📝 Payment form listener added');
    } else if (payButton) {
        // New button structure
        payButton.addEventListener('click', handlePaymentClick);
        console.log('🔘 Payment button listener added');
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    await processPayment(submitBtn);
}

async function handlePaymentClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const payButton = e.target;
    await processPayment(payButton);
}

async function processPayment(button) {
    console.log('💳 Payment process started');
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    
    console.log('📝 Form data collected:', {name, email, phone});
    
    // Validation
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
        alert('कृपया valid phone number enter करें (कम से कम 10 digits)');
        return;
    }
    
    // Show loading
    showLoading(button);
    
    try {
        console.log('🔄 Creating payment order...');
        
        // Create order with proper endpoint
        const orderResponse = await fetch('/api/payment', {
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
        
        console.log('📡 Order response status:', orderResponse.status);
        console.log('📡 Order response headers:', Object.fromEntries(orderResponse.headers.entries()));
        
        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            console.error('❌ HTTP Error:', response.status, errorText);
            throw new Error(`Server error ${orderResponse.status}: ${errorText.substring(0, 100)}`);
        }
        
        const responseText = await orderResponse.text();
        console.log('📄 Raw order response:', responseText);
        
        let orderData;
        try {
            orderData = JSON.parse(responseText);
            console.log('📦 Parsed order data:', orderData);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('❌ Response text:', responseText);
            throw new Error('Server returned invalid JSON response');
        }
        
        if (!orderData.success) {
            throw new Error(orderData.error || 'Order creation failed');
        }
        
        // Validate required fields
        if (!orderData.key || !orderData.amount || !orderData.order_id) {
            throw new Error('Invalid order data received from server');
        }
        
        console.log('🎯 Opening Razorpay payment popup...');
        
        // Open Razorpay payment
        const razorpayOptions = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'Premium API Service',
            description: 'Premium Subscription - ₹299/month',
            order_id: orderData.order_id,
            handler: function(response) {
                console.log('✅ Payment successful:', response);
                handlePaymentSuccess(response, { name, email, phone });
            },
            prefill: {
                name: name,
                email: email,
                contact: phone
            },
            notes: {
                user_name: name,
                user_email: email,
                user_phone: phone
            },
            theme: {
                color: '#667eea'
            },
            modal: {
                ondismiss: function() {
                    console.log('❌ Payment popup dismissed by user');
                    hideLoading(button);
                }
            }
        };
        
        const rzp = new Razorpay(razorpayOptions);
        
        // Handle payment failure
        rzp.on('payment.failed', function(response) {
            console.error('❌ Payment failed:', response);
            hideLoading(button);
            alert('Payment failed: ' + (response.error?.description || response.error?.reason || 'Unknown error'));
        });
        
        // Open Razorpay popup
        rzp.open();
        
    } catch (error) {
        console.error('❌ Payment process error:', error);
        hideLoading(button);
        alert('Payment Error: ' + error.message);
    }
}

// Handle Payment Success
async function handlePaymentSuccess(response, userData) {
    console.log('🎉 Processing payment success...');
    console.log('💰 Payment response:', response);
    
    try {
        // Store user data immediately
        const premiumUserData = {
            ...userData,
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            signature: response.razorpay_signature,
            subscription_date: Date.now(),
            plan: 'premium',
            status: 'active'
        };
        
        localStorage.setItem('premium_user', JSON.stringify(premiumUserData));
        console.log('💾 User data saved to localStorage');
        
        // Try to verify payment on server (optional)
        try {
            const verifyResponse = await fetch('/api/payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify_payment',
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    user_data: userData
                })
            });
            
            const verifyData = await verifyResponse.json();
            console.log('🔐 Payment verification result:', verifyData);
            
        } catch (verifyError) {
            console.log('⚠️ Payment verification failed (but proceeding anyway):', verifyError);
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
                console.log('📊 Payment logged to Firebase');
            } catch (firebaseError) {
                console.log('⚠️ Firebase logging failed:', firebaseError);
            }
        }
        
        // Show success message
        alert('🎉 Payment Successful!\n\nआपका Premium Subscription activate हो गया है!\n\nDashboard पर redirect हो रहे हैं...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Payment success handling error:', error);
        alert('Payment completed successfully!\nकृपया dashboard को manually visit करें।');
        
        // Fallback redirect
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }
}

// Premium Dashboard Handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 DOM Loaded - Initializing Dashboard');
    
    const premiumForm = document.getElementById('premiumForm');
    if (premiumForm) {
        console.log('📝 Premium dashboard form found');
        
        // Check if user is premium
        const premiumUser = localStorage.getItem('premium_user');
        if (!premiumUser) {
            console.log('❌ No premium user found, redirecting...');
            alert('कृपया पहले Premium subscription purchase करें');
            setTimeout(() => {
                window.location.href = 'subscription.html';
            }, 2000);
            return;
        }
        
        const userData = JSON.parse(premiumUser);
        console.log('✅ Premium user found:', userData);
        
        // Update dashboard stats
        updateDashboardStats(userData);
        
        premiumForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('▶️ Premium form submitted');
            
            const uidInput = document.getElementById('premiumUID');
            const submitBtn = premiumForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            console.log('🆔 Premium mode - UID entered:', uid);
            
            if (!uid) {
                showResult('premiumResult', 'कृपया एक valid UID enter करें', true);
                return;
            }
            
            if (uid.length < 3) {
                showResult('premiumResult', 'UID कम से कम 3 characters का होना चाहिए', true);
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
                            user_name: userData.name,
                            timestamp: Date.now(),
                            ip: await getClientIP()
                        });
                        console.log('📊 Premium usage logged to Firebase');
                    } catch (firebaseError) {
                        console.log('⚠️ Firebase logging failed:', firebaseError);
                    }
                }
                
            } catch (error) {
                console.error('❌ Premium mode error:', error);
                showResult('premiumResult', error.message, true);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Update Dashboard Stats
function updateDashboardStats(userData) {
    console.log('📈 Updating dashboard stats for user:', userData);
    
    const apiCalls = document.getElementById('apiCalls');
    const lastAccess = document.getElementById('lastAccess');
    const memberSince = document.getElementById('memberSince');
    
    if (apiCalls) {
        apiCalls.textContent = 'Unlimited ∞';
    }
    
    if (lastAccess) {
        lastAccess.textContent = 'अभी-अभी';
    }
    
    if (memberSince && userData.subscription_date) {
        const date = new Date(userData.subscription_date);
        memberSince.textContent = date.toLocaleDateString('hi-IN');
    }
}

// Admin Panel Handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('👨‍💼 DOM Loaded - Initializing Admin Panel');
    
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminLogout = document.getElementById('adminLogout');
    
    if (adminLoginForm) {
        console.log('🔐 Admin login form found');
        
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔑 Admin login form submitted');
            
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
            
            console.log('👤 Admin login attempt for:', username);
            
            showLoading(submitBtn);
            
            try {
                const response = await fetch('/api/admin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'login',
                        username: username,
                        password: password
                    })
                });
                
                const responseText = await response.text();
                console.log('📄 Admin login response:', responseText);
                
                const data = JSON.parse(responseText);
                
                if (response.ok && data.success) {
                    localStorage.setItem('admin_toke