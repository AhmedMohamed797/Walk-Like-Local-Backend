import mongoose from "mongoose";
import Booking from "../bookings/models/bookingModel.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const EARNINGS_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
};

const buildEarningsSort = (sortBy, sortOrder) => {
  const order = sortOrder === "asc" ? 1 : -1;

  switch (sortBy) {
    case "createdAt":
      return { createdAt: order };
    case "guideEarnings":
      return { "pricing.guideEarnings": order };
    case "tourTitle":
      return { tourTitle: order };
    default:
      return { createdAt: -1 };
  }
};

const bookingWithPaymentPipeline = (matchFilter = {}, paymentStatusFilter = "PAID") => [
  { $match: matchFilter },
  {
    $lookup: {
      from: "payments",
      localField: "paymentId",
      foreignField: "_id",
      as: "paymentDocs",
    },
  },
  { $unwind: "$paymentDocs" },
  {
    $match: {
      "paymentDocs.status":
        typeof paymentStatusFilter === "string"
          ? paymentStatusFilter
          : { $in: paymentStatusFilter },
    },
  },
];

export const getGuideEarningsSummary = async (guideId) => {
  const pipeline = [
    ...bookingWithPaymentPipeline({
      guideId: new mongoose.Types.ObjectId(guideId),
    }),
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: "$pricing.guideEarnings" },
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        activeBookings: {
          $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: {
            $cond: [
              { $in: ["$status", ["CANCELLED_BY_TOURIST", "CANCELLED_BY_GUIDE"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  const result = await Booking.aggregate(pipeline);

  if (!result.length) {
    return {
      totalEarnings: 0,
      totalBookings: 0,
      averageBookingValue: 0,
      completedBookings: 0,
      activeBookings: 0,
      cancelledBookings: 0,
    };
  }

  const data = result[0];
  return {
    totalEarnings: data.totalEarnings,
    totalBookings: data.totalBookings,
    averageBookingValue:
      data.totalBookings > 0
        ? Math.round(data.totalEarnings / data.totalBookings)
        : 0,
    completedBookings: data.completedBookings,
    activeBookings: data.activeBookings,
    cancelledBookings: data.cancelledBookings,
  };
};

export const getGuideEarningsHistory = async (guideId, queryOptions) => {
  const page = queryOptions.page || EARNINGS_DEFAULTS.DEFAULT_PAGE;
  const limit = queryOptions.limit || EARNINGS_DEFAULTS.DEFAULT_LIMIT;
  const sortBy = queryOptions.sortBy || "createdAt";
  const sortOrder = queryOptions.sortOrder || "desc";
  const from = queryOptions.from;
  const to = queryOptions.to;

  const matchFilter = { guideId: new mongoose.Types.ObjectId(guideId) };

  if (from || to) {
    const createdAtFilter = {};
    if (from) createdAtFilter.$gte = new Date(from);
    if (to) createdAtFilter.$lte = new Date(to);
    matchFilter.createdAt = createdAtFilter;
  }

  const baseStages = bookingWithPaymentPipeline(matchFilter);
  const sortObj = buildEarningsSort(sortBy, sortOrder);
  const skip = (page - 1) * limit;

  const countPipeline = [
    ...baseStages,
    { $count: "totalItems" },
  ];

  const countResult = await Booking.aggregate(countPipeline);
  const totalItems = countResult.length > 0 ? countResult[0].totalItems : 0;

  const dataPipeline = [
    ...baseStages,
    { $sort: sortObj },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        bookingId: "$_id",
        tourId: "$tourId",
        tourTitle: "$tourTitle",
        groupType: "$groupType",
        totalPrice: "$pricing.totalPrice",
        platformFee: "$pricing.platformFee",
        guideEarnings: "$pricing.guideEarnings",
        bookingStatus: "$status",
        paymentStatus: "$paymentDocs.status",
        createdAt: "$createdAt",
      },
    },
  ];

  const results = await Booking.aggregate(dataPipeline);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    results,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getGuideEarningsAnalytics = async (guideId) => {
  const pipeline = [
    ...bookingWithPaymentPipeline({
      guideId: new mongoose.Types.ObjectId(guideId),
    }),
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        earnings: { $sum: "$pricing.guideEarnings" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        month: {
          $arrayElemAt: [MONTH_NAMES, { $subtract: ["$_id.month", 1] }],
        },
        earnings: 1,
        bookings: 1,
      },
    },
  ];

  return await Booking.aggregate(pipeline);
};

export const getAdminRevenueSummary = async () => {
  const pipeline = [
    ...bookingWithPaymentPipeline({}, ["PAID", "REFUNDED"]),
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$paymentDocs.status", "PAID"] },
              "$pricing.totalPrice",
              0,
            ],
          },
        },
        platformFees: {
          $sum: {
            $cond: [
              { $eq: ["$paymentDocs.status", "PAID"] },
              "$pricing.platformFee",
              0,
            ],
          },
        },
        successfulPayments: {
          $sum: {
            $cond: [{ $eq: ["$paymentDocs.status", "PAID"] }, 1, 0],
          },
        },
        refundedPayments: {
          $sum: {
            $cond: [{ $eq: ["$paymentDocs.status", "REFUNDED"] }, 1, 0],
          },
        },
        activeBookings: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$paymentDocs.status", "PAID"] },
                  { $eq: ["$status", "ACTIVE"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        completedBookings: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$paymentDocs.status", "PAID"] },
                  { $eq: ["$status", "COMPLETED"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        platformFees: 1,
        successfulPayments: 1,
        refundedPayments: 1,
        activeBookings: 1,
        completedBookings: 1,
      },
    },
  ];

  const result = await Booking.aggregate(pipeline);

  if (!result.length) {
    return {
      totalRevenue: 0,
      platformFees: 0,
      successfulPayments: 0,
      refundedPayments: 0,
      activeBookings: 0,
      completedBookings: 0,
    };
  }

  return result[0];
};

export const getAdminRevenueAnalytics = async (year) => {
  const targetYear = year || new Date().getFullYear();
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear + 1, 0, 1);

  const pipeline = [
    ...bookingWithPaymentPipeline({
      createdAt: { $gte: yearStart, $lt: yearEnd },
    }),
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$pricing.totalPrice" },
        platformFees: { $sum: "$pricing.platformFee" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        month: {
          $arrayElemAt: [MONTH_NAMES, { $subtract: ["$_id.month", 1] }],
        },
        revenue: 1,
        platformFees: 1,
        bookings: 1,
      },
    },
  ];

  return await Booking.aggregate(pipeline);
};
