// Payment Handler - WORKING VERSION
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Payment page loaded');
    
    // Wait for Razorpay to load
    const checkRazorpay = () => {
        if (typeof Razorpay !== 'undefined') {
            console.log('✅ Razorpay loaded successfully');
            initializePayment();
        } else {
            console.log('⏳ Waiting for Razorpay...');
            setTimeout(checkRazorpay, 100);
        }
    };
    
    checkRazorpay();
});

function initializePayment() {
    const payButton = document.getElementById('payButton');
    
    if (!payButton) {
        console.log('❌ Pay button not found');
        return;
    }
    
    console.log('✅ Pay button found, adding click handler');
    
    payButton.addEventListener('click', async function(e) {
        // IMPORTANT: Prevent any default behavior
        e.preventDefault();
        e.stopPropagation();
        
        console.log('💳 Payment button clicked');
        
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        
        console.log('📝 Form data:', {name, email, phone});
        
        // Validation
        if (!name || !email || !phone) {
            alert('कृपया सभी fields भरें');
            return;
        }
        
        if (!email.includes('@')) {
            alert('कृपया valid email enter करें');
            return;
        }
        
        if (phone.length < 10) {
            alert('कृपया valid phone number enter करें');
            return;
        }
        
        // Show loading
        payButton.classList.add('loading');
        payButton.disabled = true;
        
        try {
            console.log('🔄 Creating order...');
            
            // Create order
            const orderResponse = await fetch('/api/payment.py', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create_order',
                    amount: 29900,
                    currency: 'INR',
                    user_data: { name, email, phone }
                })
            });
            
            console.log('📡 Order response status:', orderResponse.status);
            
            if (!orderResponse.ok) {
                throw new Error(`Server error: ${orderResponse.status}`);
            }
            
            const responseText = await orderResponse.text();
            console.log('📄 Raw response:', responseText);
            
            let orderData;
            try {
                orderData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                throw new Error('Server returned invalid response');
            }
            
            console.log('📦 Order data:', orderData);
            
            if (!orderData.success) {
                throw new Error(orderData.error || 'Order creation failed');
            }
            
            console.log('🎯 Opening Razorpay popup...');
            
            // Open Razorpay
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
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
                theme: {
                    color: '#667eea'
                },
                modal: {
                    ondismiss: function() {
                        console.log('❌ Payment popup closed');
                        payButton.classList.remove('loading');
                        payButton.disabled = false;
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function(response) {
                console.error('❌ Payment failed:', response);
                payButton.classList.remove('loading');
                payButton.disabled = false;
                alert('Payment failed: ' + (response.error?.description || 'Unknown error'));
            });
            
            // Open popup
            rzp.open();
            
        } catch (error) {
            console.error('❌ Payment error:', error);
            payButton.classList.remove('loading');
            payButton.disabled = false;
            alert('Error: ' + error.message);
        }
    });
}

// Handle payment success
function handlePaymentSuccess(response, userData) {
    console.log('🎉 Processing payment success...');
    
    // Store user data
    localStorage.setItem('premium_user', JSON.stringify({
        ...userData,
        payment_id: response.razorpay_payment_id,
        order_id: response.razorpay_order_id,
        signature: response.razorpay_signature,
        subscription_date: Date.now()
    }));
    
    console.log('💾 User data saved to localStorage');
    
    alert('🎉 Payment Successful! Dashboard पर जा रहे हैं...');
    
    // Redirect to dashboard
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Add this to your existing script.js file (don't replace the whole file)
console.log('🔧 Payment script loaded');
