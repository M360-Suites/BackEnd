import { Request, Response } from "express";
import {Website} from "../../../Models/Website";
import { resSender } from "../../../Services/responseService";
import validationSchema from "../../../Services/validationSchema";
import Joi from "joi";
import {Organization, User} from "../../../Models/User";
import { CustomRequest } from "../../../Types/CustomRequest";

export const createWebsite = async (
  req: CustomRequest,
  res: Response
): Promise<Response> => {
  try {
    const { name, url, description } = req.body;

    const { error } = Joi.object({
      name: validationSchema.name,
      url: validationSchema.url,
      description: validationSchema.text
    }).validate(req.body);
    if (error) return resSender(res, 400, "fail", error.details[0].message);

    if (!name || !url) return resSender(res, 400, "fail", "Name and URL are required");

    // Check if the website already exists
    const existingWebsite = await Website.findOne({ url });
    if (existingWebsite)
      return resSender(res, 400, "fail", "Website url already exists");

    // Create a new website
    const newWebsite = new Website({
      name,
      url,
      description,
      orgId: req.organizationId?._id,
      createdBy: (req.user as any)._id, // Assuming you have user authentication middleware
    });
    await newWebsite.save();

    await Organization.findByIdAndUpdate(
      (req.organizationId)?._id,
      { $push: { websites: newWebsite._id } },
      { new: true }
    );

    return resSender(res, 201, "success", "Website created successfully", null, newWebsite);
  } catch (error: any) {
    console.error("Error creating website:", error);
    return resSender(res, 500, "error", error.message || "Server error");
  }
};
