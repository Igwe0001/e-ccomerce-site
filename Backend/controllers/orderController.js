import orderModel from "../models/order.Model.js";
import userModel from "../models/userModel.js";
import axios from "axios";

//global variables
const currency = "ngn";
const deliveryCharge = 10;

//gateway initialised
// Paystack API key
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

//Placing orders using POD Mothod
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({ success: true, message: "Order Placed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//Placing orders using Stripe Mothod
const placeOrderPaystack = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    // const { origin } = req.headers;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "PayStack",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // const line_items = items.map((item) => ({
    //   price_data: {
    //     currency: currency,
    //     product_data: {
    //       name: item.name,
    //     },
    //     unit_amount: item.price * 100,
    //   },
    //   quantity: item.quantity,
    // }));

    // line_items.push({
    //   price_data: {
    //     currency: currency,
    //     product_data: {
    //       name: "Delivery Charges",
    //     },
    //     unit_amount: deliveryCharge * 100,
    //   },
    //   quantity: 1,
    // });

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "NGN", // You can make this dynamic based on your app's currency
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100, // Convert to kobo
      },
      quantity: item.quantity,
    }));

    // Add delivery charges to line items
    lineItems.push({
      price_data: {
        currency: "NGN",
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: deliveryCharge * 100, // Convert to kobo
      },
      quantity: 1,
    });

    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: address.email, // Customer's email
        amount: (amount + deliveryCharge) * 100, // Total amount in kobo
        line_items: lineItems, // Pass line_items to Paystack if needed
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    if (paystackResponse.data.status) {
      return res.json({
        success: true,
        paymentUrl: paystackResponse.data.data.authorization_url, // URL to redirect the user for payment
      });
    } else {
      return res.json({
        success: false,
        message: paystackResponse.data.message,
      });
    }

    // const session = await stripe.checkout.sessions.create({
    //   success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
    //   cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
    //   line_items,
    //   mode: "payment",
    // });

    // res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//Placing orders using Razorpay Mothod
// const placeOrderRazorpay = async (req, res) => {};

//All orders data for Admin Panel
const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//user order data for frontend
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//update order status from Admin panel
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { placeOrder, placeOrderPaystack, allOrders, userOrders, updateStatus };
