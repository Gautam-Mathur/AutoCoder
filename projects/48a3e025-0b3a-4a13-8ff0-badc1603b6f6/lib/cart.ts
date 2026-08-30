import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  image: string;
}

export class CartService {
  /**
   * Add a product to the user's cart
   * @param productId - ID of the product to add
   * @returns Promise with the created cart item
   */
  static async addToCart(productId: string, userId: string): Promise<CartItem> {
    try {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if item already exists in cart
      const existingCartItem = await prisma.cartItem.findFirst({
        where: {
          userId: userId,
          productId: productId,
        },
      });

      if (existingCartItem) {
        // Update quantity if item exists
        const updatedItem = await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + 1,
          },
        });
        return updatedItem;
      } else {
        // Create new cart item
        const newItem = await prisma.cartItem.create({
          data: {
            productId: productId,
            userId: userId,
            quantity: 1,
          },
        });
        return newItem;
      }
    } catch (error) {
      throw new Error(`Failed to add item to cart: ${error}`);
    }
  }

  /**
   * Remove a specific item from the cart
   * @param cartItemId - ID of the cart item to remove
   * @returns Promise with boolean indicating success
   */
  static async removeFromCart(cartItemId: string, userId: string): Promise<boolean> {
    try {
      // Verify that the cart item belongs to the current user
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
      });

      if (!cartItem || cartItem.userId !== userId) {
        throw new Error('Cart item not found or unauthorized access');
      }

      await prisma.cartItem.delete({
        where: { id: cartItemId },
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to remove item from cart: ${error}`);
    }
  }

  /**
   * Update the quantity of a cart item
   * @param cartItemId - ID of the cart item to update
   * @param quantity - New quantity value
   * @returns Promise with the updated cart item
   */
  static async updateCartItem(cartItemId: string, quantity: number, userId: string): Promise<CartItem> {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    try {
      // Verify that the cart item belongs to the current user
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: cartItemId },
      });

      if (!cartItem || cartItem.userId !== userId) {
        throw new Error('Cart item not found or unauthorized access');
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity,
        },
      });

      return updatedItem;
    } catch (error) {
      throw new Error(`Failed to update cart item: ${error}`);
    }
  }

  /**
   * Get all items in the user's cart
   * @returns Promise with array of cart items and product details
   */
  static async getCartItems(userId: string): Promise<Array<CartItem & { product: Product }>> {
    try {
      const cartItems = await prisma.cartItem.findMany({
        where: {
          userId: userId,
        },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return cartItems;
    } catch (error) {
      throw new Error(`Failed to retrieve cart items: ${error}`);
    }
  }

  /**
   * Clear all items from the user's cart
   * @returns Promise with boolean indicating success
   */
  static async clearCart(userId: string): Promise<boolean> {
    try {
      await prisma.cartItem.deleteMany({
        where: {
          userId: userId,
        },
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to clear cart: ${error}`);
    }
  }
}

// Export individual functions for use in API routes and components
export const addToCart = CartService.addToCart;
export const removeFromCart = CartService.removeFromCart;
export const updateCartItem = CartService.updateCartItem;
export const getCartItems = CartService.getCartItems;
export const clearCart = CartService.clearCart;