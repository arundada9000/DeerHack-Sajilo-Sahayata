import { Request, Response } from "express";
import Report from "../models/reportModel";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { resolveGaPa } from "../utils/resolveGaPa";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createReport = async (req: Request, res: Response) => {
  const allowedTypes = [
    "fire",
    "police",
    "flood",
    "accident",
    "landslide",
    "other",
  ];

  try {
    const { type, description, location } = req.body;

    if (!type || typeof type !== "string" || !allowedTypes.includes(type)) {
      res.status(400).json({
        message: `Invalid type. It must be one of: ${allowedTypes.join(", ")}.`,
      });
      return;
    }

    if (
      !description ||
      typeof description !== "string" ||
      description.length < 10
    ) {
      res.status(400).json({
        message:
          "Description must be a string and at least 10 characters long.",
      });
      return;
    }

    const parsedLocation = JSON.parse(location);
    if (!parsedLocation) {
      res.status(400).json({ message: "Location must be a valid JSON string." });
      return;
    }

    let imageUrl = "";
    let imageId = "";

    if (req.file) {
      // Check if Cloudinary is configured
      if (process.env.CLOUDINARY_API_KEY) {
        try {
          const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "reports",
          });
          imageUrl = uploadResult.secure_url;
          imageId = uploadResult.public_id;
        } catch (err) {
          console.error("Cloudinary upload failed, falling back to local:", err);
          imageUrl = `/${req.file.path.replace(/\\/g, "/")}`;
          imageId = req.file.filename;
        }
      } else {
        // Fallback to local storage if no Cloudinary keys
        imageUrl = `/${req.file.path.replace(/\\/g, "/")}`;
        imageId = req.file.filename;
      }
    }

    // Auto-detect ga-pa from coordinates
    const [lng, lat] = parsedLocation;
    const localGovName = resolveGaPa(lat, lng);

    const report = new Report({
      type,
      description,
      location: { coordinates: parsedLocation },
      localGovName,
      imageUrl,
      imageId,
    });

    await report.save();

    res.status(201).json({
      message: "Report created successfully",
      report,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(400).json({ message: "Error creating report", error });
  }
};

export const verifyReport = async (req: Request, res: Response) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    report.status = "verified";
    report.verifiedBy = req.user.id;
    await report.save();
    res.json({ message: "Report verified", report });
  } catch (error) {
    res.status(400).json({ message: "Error verifying report", error });
  }
};

export const getAllReports = async (req: Request, res: Response) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (error) {
    res.status(400).json({ message: "Error fetching reports", error });
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.json(report);
  } catch (error) {
    res.status(400).json({ message: "Error fetching report", error });
  }
};

dayjs.extend(relativeTime);

export const getAllReportLocations = async (req: Request, res: Response) => {
  try {
    const reports = await Report.find(
      {},
      {
        location: 1,
        type: 1,
        _id: 1,
        createdAt: 1,
      }
    );
    const formattedReports = reports.map((report) => {
      const c = report.location.coordinates;
      const isNewFormat = c[0] > 70;
      const lng = isNewFormat ? c[0] : c[1];
      const lat = isNewFormat ? c[1] : c[0];
      
      return {
        id: report._id,
        title: `${
          report.type.charAt(0).toUpperCase() + report.type.slice(1)
        } reported`,
        type: report.type,
        lat,
        lng,
        time: dayjs(report.createdAt).fromNow(),
      };
    });
    console.log("Formatted Reports:", formattedReports);
    res.json(formattedReports);
  } catch (error) {
    res.status(400).json({ message: "Error fetching report locations", error });
  }
};

export const changeReportStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    report.status = status;
    await report.save();
    res.json({ message: "Report status updated", report });
  } catch (error) {
    res.status(400).json({ message: "Error updating report status", error });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deleted = await Report.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Error deleting report", error });
  }
};

export const updateReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, description, status, location } = req.body;

  try {
    const report = await Report.findById(id);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }

    if (type) report.type = type;
    if (description) report.description = description;
    if (status) report.status = status;
    if (location && Array.isArray(location) && location.length >= 2) {
      report.location.coordinates = [location[0], location[1]];
    }

    // ✅ Handle image update
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (report.imageId) {
        await cloudinary.uploader.destroy(report.imageId);
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "reports",
      });

      report.imageUrl = uploadResult.secure_url;
      report.imageId = uploadResult.public_id;
    }

    await report.save();

    res.status(200).json({ message: "Report updated successfully", report });
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({ message: "Error updating report", error });
  }
};
