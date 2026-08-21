import React, { useState } from 'react';
import Header from '../components/Header';
import CheckoutForm from '../components/CheckoutForm';
import { useCart } from '../lib/context';
import { createOrder } from '../lib/api';

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const [orderStatus, setOrderStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (checkoutData) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setOrderStatus('');

    try {
      // Validate form data
      if (!checkoutData.email || !checkoutData.name || !checkoutData.address || !checkoutData.city || !checkoutData.zipCode) {
        throw new Error('Please fill in all required fields');
      }

      // Create order data
      const orderData = {
        items: cart.items,
        total: cart.total,
        customer: {
          name: checkoutData.name,
          email: checkoutData.email,
          address: checkoutData.address,
          city: checkoutData.city,
          zipCode: checkoutData.zipCode,
          country: checkoutData.country,
        },
      };

      // Create order
      const order = await createOrder(orderData);
      
      // Clear cart after successful order
      clearCart();
      
      setOrderStatus('success');
      setIsProcessing(false);
      
      // Here you would typically redirect to a confirmation page
      // or show a success message with order details
    } catch (error) {
      console.error('Checkout error:', error);
      setOrderStatus('error');
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        
        {orderStatus === 'success' ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <p>Order placed successfully! Thank you for your purchase.</p>
          </div>
        ) : orderStatus === 'error' ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>There was an error processing your order. Please try again.</p>
          </div>
        ) : null}

        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl mb-4">Your cart is empty</p>
            <a href="/" className="text-blue-600 hover:underline">Continue shopping</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <CheckoutForm onSubmit={handleCheckout} isProcessing={isProcessing} />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="space-y-3 mb-6">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p>${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold mb-2">
                    <span>Total</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Checkout;