import crypto from "crypto";
import GuideProfile from "../../guides/models/guideProfileModel.js";
import TouristProfile from "../models/touristProfileModel.js";
import ProfileChunk from "./profileChunkModel.js";
import { splitTextIntoChunks } from "./recommendationChunkService.js";
import { createEmbeddings, getEmbeddingModel } from "./recommendationEmbeddingService.js";
import { buildGuideProfileText, buildTouristProfileText } from "./recommendationProfileText.js";
import { AppError } from "../../../utils/AppError.js";

const hashText = (text) => crypto.createHash("sha256").update(text).digest("hex");

const indexProfileText = async (profileType, profileId, fullText) => {
  const chunks = splitTextIntoChunks(fullText);
  const embeddingModel = getEmbeddingModel();

  if (!chunks.length) {
    await ProfileChunk.deleteMany({ profileType, profileId });
    return { chunksIndexed: 0, reusedEmbeddings: 0, embeddedChunks: 0 };
  }

  const existingChunks = await ProfileChunk.find({ profileType, profileId }).lean();
  const existingBySlot = new Map(
    existingChunks.map((chunk) => [`${chunk.chunkIndex}:${chunk.textHash}:${chunk.embeddingModel}`, chunk]),
  );

  const chunkDocs = chunks.map((text, chunkIndex) => ({
    profileType,
    profileId,
    text,
    textHash: hashText(text),
    embeddingModel,
    chunkIndex,
  }));

  const chunksToEmbed = [];
  let reusedEmbeddings = 0;

  for (const chunk of chunkDocs) {
    const cached = existingBySlot.get(`${chunk.chunkIndex}:${chunk.textHash}:${embeddingModel}`);
    if (cached?.embedding?.length) {
      chunk.embedding = cached.embedding;
      reusedEmbeddings += 1;
    } else {
      chunksToEmbed.push(chunk);
    }
  }

  if (chunksToEmbed.length) {
    const embeddings = await createEmbeddings(chunksToEmbed.map((chunk) => chunk.text));
    chunksToEmbed.forEach((chunk, index) => {
      chunk.embedding = embeddings[index];
    });
  }

  await ProfileChunk.deleteMany({ profileType, profileId });
  await ProfileChunk.insertMany(chunkDocs);

  return {
    chunksIndexed: chunkDocs.length,
    reusedEmbeddings,
    embeddedChunks: chunksToEmbed.length,
  };
};

export const indexGuideProfile = async (guideProfileId) => {
  const guide = await GuideProfile.findById(guideProfileId).populate("user", "fullName").lean();
  if (!guide) {
    throw new AppError("Guide profile not found", 404);
  }

  return indexProfileText("guide", guide._id, buildGuideProfileText(guide));
};

export const indexGuideProfiles = async (filter = {}) => {
  const guides = await GuideProfile.find(filter).select("_id").lean();
  const results = [];

  for (const guide of guides) {
    results.push({
      guideProfileId: guide._id,
      ...(await indexGuideProfile(guide._id)),
    });
  }

  return {
    profilesIndexed: results.length,
    results,
  };
};

export const indexTouristProfile = async (touristUserId) => {
  const tourist = await TouristProfile.findOne({ user: touristUserId })
    .populate("user", "fullName")
    .lean();

  if (!tourist) {
    throw new AppError("Tourist profile not found", 404);
  }

  return indexProfileText("tourist", tourist._id, buildTouristProfileText(tourist));
};
