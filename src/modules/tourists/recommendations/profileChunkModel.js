import mongoose from "mongoose";

const profileChunkSchema = new mongoose.Schema(
  {
    profileType: {
      type: String,
      enum: ["guide", "tourist"],
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    textHash: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    embeddingModel: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true },
);

profileChunkSchema.index({ profileType: 1, profileId: 1, chunkIndex: 1 }, { unique: true });
profileChunkSchema.index({ profileType: 1, profileId: 1, textHash: 1 });

const ProfileChunk = mongoose.model("ProfileChunk", profileChunkSchema);

export default ProfileChunk;
