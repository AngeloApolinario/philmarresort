// -------------------------------
// User Routes (Profile + Booking + Polling + Notifications)
// -------------------------------

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const User = require("../models/User");
const Notification = require("../models/Notification");

// -------------------------------
// 1️⃣ View User Profile Page
// -------------------------------
router.get("/profile/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();
    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).lean();
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();

    if (!user) {
      return res.status(404).render("error", { message: "User not found." });
    }

    res.render("profile", {
      title: `${user.fullname}'s Profile`,
      user,
      bookings,
      notifications,
    });
  } catch (error) {
    console.error("❌ Error loading user profile:", error);
    res.status(500).render("error", { message: "Error loading profile page." });
  }
});

// -------------------------------
// 2️⃣ Booking Submission (User Form)
// -------------------------------
router.post("/booking/submit", async (req, res) => {
  try {
    const { userId, room, checkin, checkout, guests } = req.body;

    if (!userId || !room || !checkin || !checkout || !guests) {
      return res.status(400).send("Missing booking details.");
    }

    const newBooking = new Booking({
      userId,
      room,
      checkin,
      checkout,
      guests,
    });

    await newBooking.save();

    // 📨 Create a notification for the user
    await Notification.create({
      userId,
      message: `Your booking request for ${room} has been submitted and is pending approval.`,
      type: "booking",
    });

    console.log("✅ Booking created and notification sent:", newBooking);

    res.redirect(`/profile/${userId}`);
  } catch (error) {
    console.error("❌ Error submitting booking:", error);
    res.status(500).render("error", { message: "Booking submission failed." });
  }
});

// -------------------------------
// 3️⃣ Polling Route for Real-time User Updates (Bookings + Notifications)
// -------------------------------
router.get("/userUpdates/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).lean();
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      bookings,
      notifications,
    });
  } catch (err) {
    console.error("❌ Error in userUpdates polling:", err);
    res.json({ success: false, error: err.message });
  }
});

// -------------------------------
// 4️⃣ Cancel Booking (optional)
// -------------------------------
router.post("/booking/cancel/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    await Booking.findByIdAndDelete(bookingId);

    // 📨 Notify user
    await Notification.create({
      userId: booking.userId,
      message: `Your booking for ${booking.room} has been cancelled.`,
      type: "booking",
    });

    res.json({ success: true, message: "Booking cancelled successfully." });
  } catch (error) {
    console.error("❌ Cancel error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel booking." });
  }
});

module.exports = router;
