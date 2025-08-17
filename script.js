// Subscription Handler - Fixed Version
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
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Phone validation
            if (phone.length < 10) {
                alert('Please enter a valid phone number');
                return;
            }
            
            showLoading(submitBtn);
            
            try {
                console.log('Creating order...');
                
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
                
                if (!orderResponse.ok) {
                    const errorText = await orderResponse.text();
                    console.error('Order creation failed:', errorText);
                    throw new Error(`Server returned ${orderResponse.status}: ${errorText}`);
                }
                
                const orderData = await orderResponse.json();
                console.log('Order data:', orderData);
                
                if (!orderData.success) {
                    throw new Error(orderData.error || 'Failed to create order');
                }
                
                // Check if Razorpay is loaded
                if (typeof Razorpay === 'undefined') {
                    throw new Error('Razorpay SDK not loaded. Please refresh the page.');
                }
                
                // Initialize Razorpay
                const options = {
                    key: orderData.key,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: orderData.name || 'Premium API Service',
                    description: orderData.description || 'Premium Subscription',
                    order_id: orderData.order_id,
                    handler: function(response) {
                        console.log('Payment success:', response);
                        
                        // Verify payment
                        verifyPayment(response, { name, email, phone });
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
                            console.log('Payment cancelled by user');
                            hideLoading(submitBtn);
                        }
                    }
                };
                
                console.log('Opening Razorpay with options:', options);
                
                const rzp = new Razorpay(options);
                
                rzp.on('payment.failed', function(response) {
                    console.error('Payment failed:', response);
                    hideLoading(submitBtn);
                    alert('Payment failed: ' + (response.error.description || 'Unknown error'));
                });
                
                rzp.open();
                
            } catch (error) {
                console.error('Error in payment process:', error);
                hideLoading(submitBtn);
                alert('Error: ' + error.message);
            }
        });
    }
});

// Payment verification function
async function verifyPayment(response, userData) {
    try {
        console.log('Verifying payment...', response);
        
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
        console.log('Verification result:', verifyData);
        
        if (verifyResponse.ok && verifyData.success) {
            // Store user session
            localStorage.setItem('premium_user', JSON.stringify({
                ...userData,
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                subscription_date: Date.now()
            }));
            
            alert('Payment successful! Redirecting to dashboard...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            throw new Error(verifyData.error || 'Payment verification failed');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        alert('Payment verification failed: ' + error.message);
    }
}
