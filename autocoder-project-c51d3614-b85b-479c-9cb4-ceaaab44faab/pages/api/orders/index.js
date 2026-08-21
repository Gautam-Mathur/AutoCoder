import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { cartItems, userId, shippingAddress, paymentMethod } = req.body;

    // Validate cart items
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Invalid cart items' });
    }

    // Fetch product information for validation
    const productIds = cartItems.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    });

    // Create a map of product prices for validation
    const productPriceMap = {};
    products.forEach(product => {
      productPriceMap[product.id] = product.price;
    });

    // Validate cart items against current product prices
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${item.productId} not found` });
      }
      
      if (item.quantity <= 0) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId,
        items: orderItems,
        totalAmount,
        status: 'pending'
      }
    });

    // Process payment with Stripe
    let paymentIntent;
    if (paymentMethod === 'stripe') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: { orderId: order.id },
        automatic_payment_methods: {
          enabled: true,
        },
      });
    }

    // Update order status to paid if payment was successful
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid' }
      });
    }

    // Return order confirmation
    res.status(201).json({
      message: 'Order created successfully',
      orderId: order.id,
      totalAmount,
      paymentIntent: paymentIntent ? {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      } : null
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}