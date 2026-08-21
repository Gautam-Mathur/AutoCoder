import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Add item to cart
    try {
      const { productId, quantity, cartId } = req.body;
      
      if (!productId || !cartId) {
        return res.status(400).json({ error: 'productId and cartId are required' });
      }
      
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Create or update cart item
      const cartItem = await prisma.cartItem.upsert({
        where: {
          productId_cartId: {
            productId,
            cartId,
          },
        },
        update: {
          quantity: {
            increment: quantity || 1,
          },
        },
        create: {
          productId,
          cartId,
          quantity: quantity || 1,
        },
      });
      
      return res.status(201).json(cartItem);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return res.status(500).json({ error: 'Failed to add item to cart' });
    }
  } 
  else if (req.method === 'PUT') {
    // Update item quantity
    try {
      const { productId, quantity, cartId } = req.body;
      
      if (!productId || !cartId || quantity === undefined) {
        return res.status(400).json({ error: 'productId, cartId, and quantity are required' });
      }
      
      // Check if cart item exists
      const cartItem = await prisma.cartItem.findUnique({
        where: {
          productId_cartId: {
            productId,
            cartId,
          },
        },
      });
      
      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }
      
      // Update quantity
      const updatedCartItem = await prisma.cartItem.update({
        where: {
          productId_cartId: {
            productId,
            cartId,
          },
        },
        data: {
          quantity,
        },
      });
      
      return res.status(200).json(updatedCartItem);
    } catch (error) {
      console.error('Error updating cart item:', error);
      return res.status(500).json({ error: 'Failed to update cart item' });
    }
  } 
  else if (req.method === 'DELETE') {
    // Remove item from cart
    try {
      const { productId, cartId } = req.body;
      
      if (!productId || !cartId) {
        return res.status(400).json({ error: 'productId and cartId are required' });
      }
      
      // Check if cart item exists
      const cartItem = await prisma.cartItem.findUnique({
        where: {
          productId_cartId: {
            productId,
            cartId,
          },
        },
      });
      
      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }
      
      // Delete cart item
      await prisma.cartItem.delete({
        where: {
          productId_cartId: {
            productId,
            cartId,
          },
        },
      });
      
      return res.status(200).json({ message: 'Item removed from cart successfully' });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return res.status(500).json({ error: 'Failed to remove item from cart' });
    }
  } 
  else {
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  }
}