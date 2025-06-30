import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const checkOwnership = (Model, paramName = 'id') => 
    asyncHandler(async (req, _, next) => {
    const id = req.params[paramName]
    if (!id) throw new ApiError(400, `${paramName} is required`);
    if (!isValidObjectId(id)) throw new ApiError(400, `Invalid ${paramName}`);

    const doc = await Model.findById(id);
    if (!doc) throw new ApiError(404, `${Model.modelName} not found`);

    if (doc?.owner.toString() !== req?.user._id.toString()) 
        throw new ApiError(403, "You are not allowed to access this resource");
    req.resource = doc;
    next();
})