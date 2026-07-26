import { NextResponse } from 'next/server';

// In-memory cart storage (in production, this would be a database)
let cart = [];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: cart
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { productId, quantity } = await request.json();
    
    // Validate input
    if (!productId || quantity <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid product or quantity' },
        { status: 400 }
      );
    }
    
    // Check if product already exists in cart
    const existingItemIndex = cart.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity
      cart[existingItemIndex].quantity += quantity;
      
      // Remove item if quantity becomes 0 or less
      if (cart[existingItemIndex].quantity <= 0) {
        cart.splice(existingItemIndex, 1);
      }
    } else {
      // Add new item
      cart.push({ productId, quantity });
    }
    
    return NextResponse.json({
      success: true,
      data: cart
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { productId } = await request.json();
    
    // Validate input
    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Remove item from cart
    const initialLength = cart.length;
    cart = cart.filter(item => item.productId !== productId);
    
    if (cart.length === initialLength) {
      return NextResponse.json(
        { success: false, message: 'Product not found in cart' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: cart
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to remove item from cart' },
      { status: 500 }
    );
  }
}