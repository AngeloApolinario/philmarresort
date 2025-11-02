// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const User = require("../models/User");

// ----------------------------
// 🔒 Middleware: Protect admin routes
// ----------------------------
function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  next();
}

// ----------------------------
// ✅ Hardcoded Admin Credentials
// ----------------------------
const ADMIN_CREDENTIALS = {
  username: "philmarresortadmin",
  password: "resortphilmar2025",
};

// ----------------------------
// 🧠 LOGIN PAGE
// ----------------------------
router.get("/login", (req, res) => {
  if (req.session.admin) return res.redirect("/admin/dashboard");
  res.render("adminlog", {
    title: "Admin Login | Philmar Resort",
    error: null,
  });
});

// ----------------------------
// 🔐 LOGIN HANDLER
// ----------------------------
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    req.session.admin = { username };
    console.log("✅ Admin logged in successfully!");
    req.session.message = { type: "success", text: "Welcome back, Admin!" };
    return res.redirect("/admin/dashboard");
  }

  res.render("adminlog", {
    title: "Admin Login | Philmar Resort",
    error: "Invalid username or password",
  });
});

// ----------------------------
// 🚪 LOGOUT
// ----------------------------
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ----------------------------
// 🏠 REDIRECT /admin → /admin/dashboard
// ----------------------------
router.get("/", (req, res) => res.redirect("/admin/dashboard"));

// ----------------------------
// 📊 ADMIN DASHBOARD
// ----------------------------
router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const acceptedCount = await Booking.countDocuments({ status: "accepted" });
    const declinedCount = await Booking.countDocuments({ status: "declined" });
    const pendingCount = await Booking.countDocuments({ status: "pending" });

    const totalGuestsAgg = await Booking.aggregate([
      { $group: { _id: null, totalGuests: { $sum: "$guests" } } },
    ]);
    const totalGuests = totalGuestsAgg[0]?.totalGuests || 0;

    const totalRevenueAgg = await Booking.aggregate([
      { $match: { status: "accepted" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();

    res.render("admin", {
      title: "Dashboard | Philmar Resort",
      admin: req.session.admin,
      bookings,
      totalBookings,
      acceptedCount,
      declinedCount,
      pendingCount,
      totalGuests,
      totalRevenue,
      message: req.session.message || null,
    });

    delete req.session.message;
  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
    res.status(500).render("error", {
      title: "Error | Philmar Resort",
      message: "Failed to load dashboard.",
    });
  }
});

// ----------------------------
// 📈 ANALYTICS PAGE
// ----------------------------
router.get("/analytics", requireAdmin, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const totalRevenueAgg = await Booking.aggregate([
      { $match: { status: "accepted" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

    const totalGuestsAgg = await Booking.aggregate([
      { $group: { _id: null, totalGuests: { $sum: "$guests" } } },
    ]);
    const totalGuests = totalGuestsAgg[0]?.totalGuests || 0;

    res.render("admin/analytics", {
      title: "Analytics | Philmar Resort",
      admin: req.session.admin,
      totalBookings,
      totalRevenue,
      totalGuests,
    });
  } catch (err) {
    console.error("❌ Error loading analytics:", err);
    res.status(500).render("error", {
      title: "Error | Philmar Resort",
      message: "Failed to load analytics.",
    });
  }
});

// ----------------------------
// 🕓 HISTORY PAGE
// ----------------------------
router.get("/history", requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).lean();

    res.render("admin/history", {
      title: "Booking History | Philmar Resort",
      admin: req.session.admin,
      bookings,
    });
  } catch (err) {
    console.error("❌ Error loading history:", err);
    res.status(500).render("error", {
      title: "Error | Philmar Resort",
      message: "Failed to load booking history.",
    });
  }
});

// ----------------------------
// 👥 USERS PAGE
// ----------------------------
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();

    res.render("admin/users", {
      title: "Users | Philmar Resort",
      admin: req.session.admin,
      users,
    });
  } catch (err) {
    console.error("❌ Error loading users:", err);
    res.status(500).render("error", {
      title: "Error | Philmar Resort",
      message: "Failed to load users.",
    });
  }
});

// ----------------------------
// ⚙️ SETTINGS PAGE
// ----------------------------
router.get("/settings", requireAdmin, (req, res) => {
  res.render("admin/settings", {
    title: "Settings | Philmar Resort",
    admin: req.session.admin,
  });
});

// ----------------------------
// ✅ ACCEPT BOOKING
// ----------------------------
router.post("/accept/:id", requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      req.session.message = { type: "error", text: "Booking not found." };
      return res.redirect("/admin/dashboard");
    }

    booking.status = "accepted";
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      message: `✅ Your booking for ${booking.room} has been accepted!`,
      type: "booking",
    });

    req.session.message = { type: "success", text: "Booking accepted successfully!" };
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("❌ Error accepting booking:", err);
    req.session.message = { type: "error", text: "Error accepting booking." };
    res.redirect("/admin/dashboard");
  }
});

// ----------------------------
// ❌ DECLINE BOOKING
// ----------------------------
router.post("/decline/:id", requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      req.session.message = { type: "error", text: "Booking not found." };
      return res.redirect("/admin/dashboard");
    }

    booking.status = "declined";
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      message: `❌ Your booking for ${booking.room} has been declined.`,
      type: "booking",
    });

    req.session.message = { type: "success", text: "Booking declined successfully!" };
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("❌ Error declining booking:", err);
    req.session.message = { type: "error", text: "Error declining booking." };
    res.redirect("/admin/dashboard");
  }
});

// ----------------------------
// 🗑️ DELETE BOOKING
// ----------------------------
router.post("/bookings/delete/:id", requireAdmin, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    req.session.message = { type: "success", text: "Booking deleted successfully!" };
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("❌ Error deleting booking:", err);
    req.session.message = { type: "error", text: "Error deleting booking." };
    res.redirect("/admin/dashboard");
  }
});

module.exports = router;
