import { isValidObjectId } from "mongoose";
import { ApiError } from "./ApiError"

export const verifyId = (id) => {
    if (!id) throw new ApiError(400, "Id not found");
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
}