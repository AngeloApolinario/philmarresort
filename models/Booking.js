// models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // 🧍 User reference (from logged-in user session)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required for booking."],
    },

    // 🧍 Optional guest name (auto-filled from user account if available)
    name: {
      type: String,
      trim: true,
      default: "",
    },

    // 🏠 Room type
    room: {
      type: String,
      required: [true, "Room type is required"],
      enum: ["aircon", "bahaykubo", "cottage", "open", "tent"],
    },

    // 💰 Price per night (auto-filled based on room)
    pricePerNight: {
      type: Number,
      default: 0,
    },

    // 💵 Total computed price (pricePerNight * nights)
    totalPrice: {
      type: Number,
      default: 0,
    },

    // 🧾 Category for analytics (e.g., "accommodation" or "addon")
    salesCategory: {
      type: String,
      default: "accommodation",
    },

    // 📅 Check-in date
    checkin: {
      type: Date,
      required: [true, "Check-in date is required"],
      validate: {
        validator: function (value) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkinDate = new Date(value);
          checkinDate.setHours(0, 0, 0, 0);
          return checkinDate >= today;
        },
        message: "Check-in date cannot be in the past.",
      },
    },

    // 📅 Check-out date
    checkout: {
      type: Date,
      required: [true, "Check-out date is required"],
      validate: {
        validator: function (value) {
          if (!this.checkin) return false;
          const checkinDate = new Date(this.checkin);
          checkinDate.setHours(0, 0, 0, 0);
          const checkoutDate = new Date(value);
          checkoutDate.setHours(0, 0, 0, 0);
          return checkoutDate > checkinDate;
        },
        message: "Check-out date must be after check-in date.",
      },
    },

    // 👥 Number of guests
    guests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "At least one guest is required"],
      max: [20, "Maximum 20 guests allowed"],
    },

    // 📞 Contact number
    contact: {
      type: String,
      trim: true,
    },

    // 📝 Special requests
    specialRequests: {
      type: String,
      trim: true,
    },

    // ✅ Booking status
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🧩 Virtual: number of nights
bookingSchema.virtual("nights").get(function () {
  if (this.checkin && this.checkout) {
    const diffMs = this.checkout - this.checkin;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// 🧮 Auto-calculate total price based on room type + nights
bookingSchema.pre("save", function (next) {
  const roomRates = {
    aircon: 3500,
    bahaykubo: 1500,
    cottage: 1200,
    open: 1000,
    tent: 500,
  };

  this.pricePerNight = roomRates[this.room] || 0;
  this.totalPrice = this.pricePerNight * this.nights;
  next();
});

// 🧹 Ensure default status for legacy docs
bookingSchema.pre("save", function (next) {
  if (!this.status) this.status = "pending";
  next();
});

// 🧩 Auto-fill guest name from user (if available)
bookingSchema.pre("save", async function (next) {
  if (!this.name && this.userId) {
    try {
      const User = mongoose.model("User");
      const user = await User.findById(this.userId).lean();
      if (user && user.fullname) this.name = user.fullname;
    } catch (err) {
      console.error("⚠️ Error auto-filling guest name:", err);
    }
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
