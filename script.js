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

// Initialize Firebase (Optional)
let app, database;
try {
    if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log('✅ Firebase initialized');
    }
} catch (error) {
    console.log('⚠️ Firebase not available:', error);
}

// Utility Functions
function showLoading(button) {
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }
}

function hideLoading(button) {
    if (button) {
        button.classList.remove('loading');
        button.disabled = false;
    }
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
                showResult('freeResult', 'कृपया एक valid UID enter करें', true);
                return;
            }
            
            hideResult('freeResult');
            showLoading(submitBtn);
            
            try {
                // Direct API call to external service
                const response = await fetch(`https://narayan-like-api-wine.vercel.app/${uid}/ind/xyz`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Limit data for free users
                    const limitedData = {
                        message: 'Limited data for free users',
                        sample: JSON.stringify(data).substring(0, 200) + '...',
                        upgrade: 'Subscribe to Premium for full access'
                    };
                    
                    showResult('freeResult', 'Data retrieved successfully (Limited)', false, limitedData);
                } else {
                    throw new Error(`API returned ${response.status}`);
                }
                
            } catch (error) {
                showResult('freeResult', 'Error fetching data: ' + error.message, true);
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
            alert('कृपया पहले Premium subscription purchase करें');
            setTimeout(() => {
                window.location.href = 'subscription.html';
            }, 2000);
            return;
        }
        
        const userData = JSON.parse(premiumUser);
        updateDashboardStats(userData);
        
        premiumForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const uidInput = document.getElementById('premiumUID');
            const submitBtn = premiumForm.querySelector('button[type="submit"]');
            const uid = uidInput.value.trim();
            
            if (!uid) {
                showResult('premiumResult', 'कृपया एक valid UID enter करें', true);
                return;
            }
            
            hideResult('premiumResult');
            showLoading(submitBtn);
            
            try {
                // Direct API call to external service (Premium gets full data)
                const response = await fetch(`https://narayan-like-api-wine.vercel.app/${uid}/ind/xyz`);
                
                if (response.ok) {
                    const data = await response.json();
                    showResult('premiumResult', 'Premium data retrieved successfully!', false, data);
                } else {
                    throw new Error(`API returned ${response.status}`);
                }
                
            } catch (error) {
                showResult('premiumResult', 'Error fetching data: ' + error.message, true);
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
    
    if (apiCalls) apiCalls.textContent = 'Unlimited ∞';
    if (lastAccess) lastAccess.textContent = 'अभी-अभी';
    if (memberSince && userData.subscription_date) {
        const date = new Date(userData.subscription_date);
        memberSince.textContent = date.toLocaleDateString('hi-IN');
    }
}

console.log('🚀 Script loaded - Frontend only integration!');
