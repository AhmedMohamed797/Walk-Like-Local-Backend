import mongoose from "mongoose";

const touristProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    interests: [
      {
        type: String,
      },
    ],

    preferredLanguages: [
      {
        type: String,
      },
    ],

    nationality: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const TouristProfile = mongoose.model("TouristProfile", touristProfileSchema);

export default TouristProfile;
