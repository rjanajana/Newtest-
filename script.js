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
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
} catch (error) {
    console.log('Firebase not available:', error);
}

// Razorpay Configuration
const RAZORPAY_KEY_ID = "rzp_test_lkoFfNbWaRVyLf";

// Utility Functions
function showLoading(button) {
    button.classList.add('loading');
    button.disabled = true;
}

function hideLoading(button) {
    button.classList.remove('loading');
    button.disabled = false;
}

function showResult(containerId, message, isError = false, data = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.className = `result-container show ${isError ? 'error' : 'success'}`;
    
    let content = `<strong>${isError ? 'Error:' : 'Success:'}</strong> ${message}`;
    
    if (data && !isError) {
        content += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    
    container.innerHTML = content;
}

function hideResult(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('show');
    }
}

// API Call Function
async function callExternalAPI(uid, isPremium = false) {
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
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API call failed');
        }
        
        return data;
    } catch (error) {
        throw new Error(`API Error: ${error.message}`);
    }
}

// Free Mode Handler
document.addEventListener('DOMContentLoaded', function() {
    const freeForm = document.getElementById('freeForm');
    if (freeForm) {
        freeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const uidInput = document.getElementById('freeUID');
            const submitBtn = freeForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            if (!uid) {
                showResult('freeResult', 'Please enter a valid UID', true);
                return;
            }
            
            hideResult('freeResult');
            showLoading(submitBtn);
            
            try {
                const data = await callExternalAPI(uid, false);
                showResult('freeResult', 'Data retrieved successfully!', false, data);
                
                // Log usage to Firebase
                if (database) {
                    database.ref('usage/free').push({
                        uid: uid,
                        timestamp: Date.now(),
                        ip: await getClientIP()
                    });
                }
                
            } catch (error) {
                showResult('freeResult', error.message, true);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Subscription Handler
document.addEventListener('DOMContentLoaded', function() {
    const subscriptionForm = document.getElementById('subscriptionForm');
    if (subscriptionForm) {
        subscriptionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            const phone = document.getElementById('userPhone').value.trim();
            const submitBtn = subscriptionForm.querySelector('button[type="submit"]');
            
            if (!name || !email || !phone) {
                alert('Please fill in all fields');
                return;
            }
            
            showLoading(submitBtn);
            
            try {
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
                
                const orderData = await orderResponse.json();
                
                if (!orderResponse.ok) {
                    throw new Error(orderData.error || 'Failed to create order');
                }
                
                // Initialize Razorpay
                const options = {
                    key: RAZORPAY_KEY_ID,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: 'Premium API Service',
                    description: 'Premium Subscription',
                    order_id: orderData.order_id,
                    handler: async function(response) {
                        try {
                            // Verify payment
                            const verifyResponse = await fetch('/api/payment.py', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    action: 'verify_payment',
                                    ...response,
                                    user_data: { name, email, phone }
                                })
                            });
                            
                            const verifyData = await verifyResponse.json();
                            
                            if (verifyResponse.ok && verifyData.success) {
                                // Store user session
                                localStorage.setItem('premium_user', JSON.stringify({
                                    name,
                                    email,
                                    phone,
                                    payment_id: response.razorpay_payment_id,
                                    subscription_date: Date.now()
                                }));
                                
                                // Redirect to dashboard
                                window.location.href = 'dashboard.html';
                            } else {
                                throw new Error('Payment verification failed');
                            }
                        } catch (error) {
                            alert('Payment verification failed: ' + error.message);
                        }
                    },
                    prefill: {
                        name: name,
                        email: email,
                        contact: phone
                    },
                    theme: {
                        color: '#667eea'
                    }
                };
                
                const rzp = new Razorpay(options);
                rzp.open();
                
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Premium Dashboard Handler
document.addEventListener('DOMContentLoaded', function() {
    const premiumForm = document.getElementById('premiumForm');
    if (premiumForm) {
        // Check if user is premium
        const premiumUser = localStorage.getItem('premium_user');
        if (!premiumUser) {
            window.location.href = 'subscription.html';
            return;
        }
        
        const userData = JSON.parse(premiumUser);
        
        // Update stats
        updateDashboardStats(userData);
        
        premiumForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const uidInput = document.getElementById('premiumUID');
            const submitBtn = premiumForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            if (!uid) {
                showResult('premiumResult', 'Please enter a valid UID', true);
                return;
            }
            
            hideResult('premiumResult');
            showLoading(submitBtn);
            
            try {
                const data = await callExternalAPI(uid, true);
                showResult('premiumResult', 'Premium data retrieved successfully!', false, data);
                
                // Log usage to Firebase
                if (database) {
                    database.ref('usage/premium').push({
                        uid: uid,
                        user_email: userData.email,
                        timestamp: Date.now(),
                        ip: await getClientIP()
                    });
                }
                
            } catch (error) {
                showResult('premiumResult', error.message, true);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
});

// Update Dashboard Stats
function updateDashboardStats(userData) {
    const apiCalls = document.getElementById('apiCalls');
    const lastAccess = document.getElementById('lastAccess');
    const memberSince = document.getElementById('memberSince');
    
    if (apiCalls) apiCalls.textContent = 'Unlimited';
    if (lastAccess) lastAccess.textContent = 'Just now';
    if (memberSince) {
        const date = new Date(userData.subscription_date);
        memberSince.textContent = date.toLocaleDateString();
    }
}

// Admin Panel Handler
document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminLogout = document.getElementById('adminLogout');
    
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
            
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
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    localStorage.setItem('admin_token', data.token);
                    adminLogin.style.display = 'none';
                    adminDashboard.style.display = 'block';
                    loadAdminData();
                } else {
                    alert('Invalid credentials');
                }
                
            } catch (error) {
                alert('Login failed: ' + error.message);
            } finally {
                hideLoading(submitBtn);
            }
        });
    }
    
    if (adminLogout) {
        adminLogout.addEventListener('click', function() {
            localStorage.removeItem('admin_token');
            adminLogin.style.display = 'block';
            adminDashboard.style.display = 'none';
        });
    }
    
    // Check if admin is already logged in
    if (localStorage.getItem('admin_token') && adminLogin && adminDashboard) {
        adminLogin.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAdminData();
    }
});

// Load Admin Data
async function loadAdminData() {
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) return;
        
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
        
        const data = await response.json();
        
        if (response.ok) {
            updateAdminStats(data);
            loadUsersTable(data.users || []);
            loadPaymentsTable(data.payments || []);
        }
        
    } catch (error) {
        console.error('Failed to load admin data:', error);
    }
}

// Update Admin Stats
function updateAdminStats(data) {
    const totalUsers = document.getElementById('totalUsers');
    const premiumUsers = document.getElementById('premiumUsers');
    const totalRevenue = document.getElementById('totalRevenue');
    const totalApiCalls = document.getElementById('totalApiCalls');
    
    if (totalUsers) totalUsers.textContent = data.total_users || 0;
    if (premiumUsers) premiumUsers.textContent = data.premium_users || 0;
    if (totalRevenue) totalRevenue.textContent = `₹${data.total_revenue || 0}`;
    if (totalApiCalls) totalApiCalls.textContent = data.total_api_calls || 0;
}

// Load Users Table
function loadUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.plan}</td>
            <td><span class="status-${user.status}">${user.status}</span></td>
            <td>${new Date(user.joined).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Load Payments Table
function loadPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.user_name}</td>
            <td>₹${payment.amount / 100}</td>
            <td>${payment.payment_id}</td>
            <td><span class="status-${payment.status}">${payment.status}</span></td>
            <td>${new Date(payment.created_at).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Get Client IP (for logging)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// Page Load Animations
document.addEventListener('DOMContentLoaded', function() {
    // Add entrance animations to elements
    const animatedElements = document.querySelectorAll('.btn, .feature, .form-card, .pricing-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = Math.random() * 0.3 + 's';
                entry.target.classList.add('fade-in');
            }
        });
    });
    
    animatedElements.forEach(el => observer.observe(el));
});
